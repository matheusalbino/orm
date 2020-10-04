import * as ORM from "./storage";
import { mapKeys, snakeCase, forEach } from "lodash";
import deepmerge from "deepmerge";
import debug from "debug";
import knex from "knex";

const logger = debug("equal:utils");

export function getEntityMetadata(entity: Function) {
  const tableMetadata = ORM.entities.find((table) => table.target === entity);

  if (tableMetadata === undefined) {
    throw new Error("invalid table metadata");
  }

  const { name: tableName } = tableMetadata;

  const properties = ORM.entityColumns.get(entity) ?? [];

  return { tableName, entity, columns: properties };
}

export function getEntityColumns(entity: Function): Array<ColumnData> {
  const { columns } = getEntityMetadata(entity);

  return columns.filter((column) => column.entity === undefined);
}

export function getEntityColumnsWithAlias(entity: Function): Array<Record<string, string>> {
  const { tableName } = getEntityMetadata(entity);

  return getEntityColumns(entity).map((column) => ({
    [`${tableName}_${column.name}`]: `${tableName}.${column.name}`,
  }));
}

export function getEntityRelations(entity: Function): Array<ColumnData> {
  const { columns } = getEntityMetadata(entity);

  return columns.filter((column) => column.entity !== undefined);
}

export function getRepositoryMetadata(repository: Function) {
  const metadata = ORM.repositories.find((repo) => repo.target === repository);

  if (metadata === undefined) {
    throw new Error("invalid repository metadata");
  }

  return metadata;
}

export function getEntityTableName(entity: Function) {
  const { tableName } = getEntityMetadata(entity);

  return tableName;
}

export function toTable<T extends object>(data: T) {
  const result = mapKeys(data, (_value, key) => snakeCase(key));

  logger("toTable %O", result);

  return result;
}

export function toEntity<T>(entity: Function, data: Array<object>): Array<T>;
export function toEntity<T>(entity: Function, data: object): T;
export function toEntity<T>(entity: Function, data: object): Array<T> | T {
  const entityName = snakeCase(entity.name);

  const format = (item: any) => {
    const baseEntity = new (entity as EntityClass)();

    const relations = getEntityRelations(entity);

    relations.forEach((relation) => {
      if (relation.entity !== undefined && typeof relation.type === "function") {
        baseEntity[relation.name] = new (relation.type as EntityClass)();
      }
    });

    const relationData = new Map<Function, { value: any; prop: string; ref: string }[]>();

    forEach(item, (value, key) => {
      const [target, ...restProp] = key.split("_");
      const prop = Array.isArray(restProp) ? restProp.join("_") : restProp;

      if (target === entityName) {
        baseEntity[prop] = value;
      } else {
        const ref = Object.keys(baseEntity).find((attr) => attr.includes(target));

        if (ref === undefined) {
          throw new Error(`invalid property ${target}`);
        }

        const subClass = ORM.entities.find((item) => item.name === target);

        if (subClass === undefined) {
          throw new Error(`invalid entity ${target}`);
        }

        const data = relationData.get(subClass.target) ?? [];

        data.push({ value, prop, ref });

        relationData.set(subClass.target, data);
      }
    });

    relationData.forEach((data, subClass) => {
      const subInstance = new (subClass as EntityClass)();
      let reference: string | undefined;

      data.forEach(({ prop, value, ref }) => {
        reference = ref;
        subInstance[prop] = value;
      });

      if (reference !== undefined) {
        baseEntity[reference].push(subInstance);
      }
    });

    return baseEntity;
  };

  let result: Array<T> | T;

  if (Array.isArray(data)) {
    result = data.map(format);

    const resultFinal = new Map<string, T>();

    result.forEach((item: any) => {
      const data: any = resultFinal.get(item.id) ?? {};

      resultFinal.set(
        item.id,
        deepmerge(data, item, {
          clone: false,
        })
      );
    });

    result = Array.from(resultFinal.values());
  } else {
    result = format(data);
  }

  logger("toEntity %O", result);

  return result;
}

export function printQuery(logger: debug.Debugger, query: knex.QueryBuilder | knex.SchemaBuilder) {
  return logger("\x1b[36m%s\x1b[0m", query.toQuery());
}
