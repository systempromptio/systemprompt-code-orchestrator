export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Maybe<T> = T | null | undefined;

export type DeepPartial<T> = T extends object ? {
  [P in keyof T]?: DeepPartial<T[P]>;
} : T;

export type DeepReadonly<T> = T extends object ? {
  readonly [P in keyof T]: DeepReadonly<T[P]>;
} : T;

export type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

export type DeepMutable<T> = T extends object ? {
  -readonly [P in keyof T]: DeepMutable<T[P]>;
} : T;

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = 
  Pick<T, Exclude<keyof T, Keys>> & {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys];

export type RequireOnlyOne<T, Keys extends keyof T = keyof T> = 
  Pick<T, Exclude<keyof T, Keys>> & {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Record<Exclude<Keys, K>, undefined>>;
  }[Keys];

export type NonEmptyArray<T> = [T, ...T[]];

export type ValueOf<T> = T[keyof T];

export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

export type PickByType<T, U> = Pick<T, KeysOfType<T, U>>;

export type OmitByType<T, U> = Omit<T, KeysOfType<T, U>>;

export type Entries<T> = {
  [K in keyof T]: [K, T[K]];
}[keyof T][];

export type FromEntries<T extends readonly (readonly [PropertyKey, unknown])[]> = {
  [K in T[number][0]]: Extract<T[number], readonly [K, unknown]>[1];
};

export type Awaited<T> = T extends PromiseLike<infer U> ? U : T;

export type PromiseValue<T> = T extends Promise<infer U> ? U : never;

export type AsyncReturnType<T extends (...args: unknown[]) => Promise<unknown>> = 
  T extends (...args: unknown[]) => Promise<infer R> ? R : never;

export type Constructor<T = {}> = new (...args: unknown[]) => T;

export type AbstractConstructor<T = {}> = abstract new (...args: unknown[]) => T;

export type Branded<T, Brand extends string> = T & { readonly __brand: Brand };

export function createBranded<T, Brand extends string>(value: T): Branded<T, Brand> {
  return value as Branded<T, Brand>;
}

export function removeUndefined<T extends Record<string, unknown>>(obj: T): {
  [K in keyof T]-?: Exclude<T[K], undefined>;
} {
  const result = {} as { [K in keyof T]-?: Exclude<T[K], undefined> };
  for (const key in obj) {
    if (obj[key] !== undefined) {
      result[key] = obj[key] as Exclude<T[typeof key], undefined>;
    }
  }
  return result;
}

export function removeNull<T extends Record<string, unknown>>(obj: T): {
  [K in keyof T]-?: Exclude<T[K], null>;
} {
  const result = {} as { [K in keyof T]-?: Exclude<T[K], null> };
  for (const key in obj) {
    if (obj[key] !== null) {
      result[key] = obj[key] as Exclude<T[typeof key], null>;
    }
  }
  return result;
}

export function removeNullish<T extends Record<string, unknown>>(obj: T): {
  [K in keyof T]-?: NonNullable<T[K]>;
} {
  const result = {} as { [K in keyof T]-?: NonNullable<T[K]> };
  for (const key in obj) {
    if (obj[key] != null) {
      result[key] = obj[key] as NonNullable<T[typeof key]>;
    }
  }
  return result;
}

export function entries<T extends Record<string, unknown>>(obj: T): Entries<T> {
  return Object.entries(obj) as Entries<T>;
}

export function fromEntries<T extends readonly (readonly [PropertyKey, unknown])[]>(
  entries: T
): FromEntries<T> {
  return Object.fromEntries(entries) as FromEntries<T>;
}

export function keys<T extends Record<string, unknown>>(obj: T): (keyof T)[] {
  return Object.keys(obj) as (keyof T)[];
}

export function values<T extends Record<string, unknown>>(obj: T): ValueOf<T>[] {
  return Object.values(obj) as ValueOf<T>[];
}

export function mapObject<T extends Record<string, unknown>, U>(
  obj: T,
  fn: (value: T[keyof T], key: keyof T) => U
): Record<keyof T, U> {
  const result = {} as Record<keyof T, U>;
  for (const key in obj) {
    result[key] = fn(obj[key], key);
  }
  return result;
}

export function filterObject<T extends Record<string, unknown>>(
  obj: T,
  predicate: (value: T[keyof T], key: keyof T) => boolean
): Partial<T> {
  const result: Partial<T> = {};
  for (const key in obj) {
    if (predicate(obj[key], key)) {
      result[key] = obj[key];
    }
  }
  return result;
}

export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result;
}