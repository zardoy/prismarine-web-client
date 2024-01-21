import classNames from 'classnames';
import { Typography, TypographyProps } from '../Typography';

import styles from './Text.module.css';

export type TextProps = TypographyProps;

export const Text = ({ Component = 'span', className, ...restProps }: TextProps) => {
  return <Typography Component={Component} className={classNames(styles.root, className)} {...restProps} />;
};
