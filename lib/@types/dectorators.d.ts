declare type EntityClass = { new (): T };

declare type RelationType = "OneToOne" | "OneToMany" | "ManyToOne" | "ManyToMany";

declare interface ColumnData {
  name: string;
  type: Function | string;
  primary: boolean;
  entity?: Entity;
  relation?: string;
  relationType?: RelationType;
}

declare interface ColumnOptions {
  name?: string;
  type?: Function | string;
  primary?: boolean;
  entity?: Entity;
  relation?: string;
  relationType?: RelationType;
}

declare interface EntityOptions {
  name: string;
}

declare interface EntityData {
  target: Function;
  name: string;
}

declare interface RepositoryData {
  target: Function;
  entity: Function;
}
