import { ElementType, ReactNode, Ref } from 'react';

export interface HasChildren {
  children?: ReactNode;
}

export type HasDataAttribute = Record<`data-${string}`, string | number | boolean | undefined | null>;

export interface HasRootRef<T> {
  getRootRef?: Ref<T>;
}

export interface HasRef<T> {
  getRef?: Ref<T>;
}

export interface HasComponent {
  Component?: ElementType;
}

export type StylesMap<T extends string> = Record<T, string>;
