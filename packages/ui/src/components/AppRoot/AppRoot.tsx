import classNames from 'classnames';
import { HTMLAttributes } from 'react';

import styles from './AppRoot.module.css';

export interface AppRootProps extends HTMLAttributes<HTMLDivElement> {}

export const AppRoot = ({ className, ...restProps }: AppRootProps) => {
  return <div className={classNames(styles.root, className)} {...restProps} />;
};
