import debug from "debug";
import {
  getEntityMetadata,
  getEntityColumnsWithAlias,
  getEntityRelations,
  getEntityColumns,
  getRepositoryMetadata,
  getEntityTableName,
  toTable,
  toEntity,
  printQuery,
} from "./utils";
import { merge } from "lodash";
import knex from "knex";

const connection = knex({
  client: "pg",
  connection: {
    host: "127.0.0.1",
    user: "equal",
    password: "equal",
    database: "orm",
    port: 5433,
  },
});

const logger = debug("equal:repository");

export interface FindOptions {
  relations?: string[];
}

export abstract class Repository<T extends object> {
  private tableName: string;
  private metadata: RepositoryData;

  constructor() {
    this.metadata = getRepositoryMetadata(this.constructor);
    this.tableName = getEntityTableName(this.metadata.entity);
  }

  async createTable(dropIfExists: boolean = false): Promise<void> {
    const { entity } = this.metadata;
    const entityColumns = getEntityColumns(entity);

    if (dropIfExists === true) {
      const query = connection.schema.dropTableIfExists(this.tableName);

      printQuery(logger, query);

      await query;
    }

    const hasTable = await connection.schema.hasTable(this.tableName);

    if (hasTable === false) {
      await connection.schema.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

      const query = connection.schema.createTable(this.tableName, (table) => {
        entityColumns.forEach((column) => {
          if (column.type === String) {
            table.string(column.name);
          } else if (column.type === Number) {
            table.float(column.name);
          } else if (column.type === Boolean) {
            table.boolean(column.name);
          } else if (column.type === "uuid") {
            if (column.primary === true) {
              table.uuid(column.name).primary().defaultTo(connection.raw("uuid_generate_v4()"));
            } else {
              table.uuid(column.name);
            }
          }
        });
      });

      printQuery(logger, query);

      await query;
    }
  }

  async find(options?: FindOptions): Promise<Array<T>> {
    const { entity } = this.metadata;
    const entityColumns = getEntityColumnsWithAlias(entity);
    const entityRelations = getEntityRelations(entity);

    const query = connection.select(entityColumns).from<T, Array<T>>(this.tableName);

    entityRelations
      .filter((column) => options?.relations?.includes(column.name))
      .forEach((column) => {
        const { tableName: joinTableName } = getEntityMetadata(column.entity);

        entityColumns.push(...getEntityColumnsWithAlias(column.entity));

        query.leftJoin(joinTableName, `${this.tableName}.id`, `${joinTableName}.${column.relation}`);
      });

    printQuery(logger, query);

    return toEntity<T>(entity, await query);
  }

  async save(data: Partial<T>): Promise<void> {
    const { entity } = this.metadata;
    const entityColumns = getEntityColumns(entity).map(
      (column) => `${this.tableName}.${column.name} as ${this.tableName}_${column.name}`
    );

    const query = connection.insert(toTable(data)).into<T>(this.tableName).returning(entityColumns);

    printQuery(logger, query);

    const [result] = await query;

    merge(data, toEntity<T>(entity, result));
  }
}
