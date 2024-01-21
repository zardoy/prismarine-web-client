import classNames from 'classnames';
import { AllHTMLAttributes } from 'react';

import { HasComponent, HasRootRef } from '../../types';

export interface RootComponentProps<T> extends AllHTMLAttributes<T>, HasRootRef<T>, HasComponent {
  baseClassName?: string | false;
}

export const RootComponent = <T,>({
  Component = 'div',
  getRootRef,
  baseClassName,
  className,
  ...restProps
}: RootComponentProps<T>) => {
  return <Component ref={getRootRef} className={classNames(baseClassName, className)} {...restProps} />;
};
