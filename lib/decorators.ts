import debug from "debug";
import { snakeCase } from "lodash";
import * as ORM from "./storage";

const logger = debug("equal:decorator");

export function EntityRepository(entity: Function): ClassDecorator {
  return function <TFunction extends Function>(target: TFunction): void {
    logger("Repository", target);

    ORM.repositories.push({ target, entity });
  };
}

export function Entity(options?: EntityOptions): ClassDecorator {
  return function <TFunction extends Function>(target: TFunction): void {
    logger("Entity", target);

    ORM.entities.push({ target, name: options?.name ?? snakeCase(target.name) });
  };
}

export function Column(options?: ColumnOptions): PropertyDecorator {
  return function (target: Object, propertyKey: string | symbol) {
    logger("Column", propertyKey);

    const properties = ORM.entityColumns.get(target.constructor) ?? new Array<ColumnData>();

    const column: ColumnData = {
      name: options?.name ?? snakeCase(propertyKey.toString()),
      primary: options?.primary ?? false,
      type: options?.type ?? Reflect.getMetadata("design:type", target, propertyKey),
      entity: options?.entity,
      relation: options?.relation,
      relationType: options?.relationType,
    };

    if (options?.entity !== undefined && column.relation === undefined) {
      column.relation = `${snakeCase(target.constructor.name)}_id`;
    }

    properties.push(column);

    ORM.entityColumns.set(target.constructor, properties);
  };
}
