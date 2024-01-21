import classNames from 'classnames';
import { AllHTMLAttributes, JSX } from 'react';

import { RootComponent } from '../RootComponent';

import { HasComponent, HasRootRef, StylesMap } from '../../types';

import styles from './Typography.module.css';

type Color =
  | 'black'
  | 'dark_blue'
  | 'dark_green'
  | 'dark_aqua'
  | 'dark_red'
  | 'dark_purple'
  | 'gold'
  | 'gray'
  | 'dark_gray'
  | 'blue'
  | 'green'
  | 'aqua'
  | 'red'
  | 'light_purple'
  | 'yellow'
  | 'white'
  | 'minecoin_gold'
  | 'material_quartz'
  | 'material_iron'
  | 'material_netherite'
  | 'material_redstone'
  | 'material_copper'
  | 'material_gold'
  | 'material_emerald'
  | 'material_diamond'
  | 'material_lapis'
  | 'material_amethyst';

type ColorCode =
  | '0'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | 'a'
  | 'b'
  | 'c'
  | 'd'
  | 'e'
  | 'f'
  | 'g'
  | 'h'
  | 'i'
  | 'j'
  | 'm'
  | 'n'
  | 'p'
  | 'q'
  | 's'
  | 't'
  | 'u';

export interface TypographyProps extends AllHTMLAttributes<HTMLElement>, HasComponent, HasRootRef<HTMLElement> {
  color: Color | ColorCode | string;
  bold?: boolean;
  shadow?: boolean;
  italic?: boolean;
  normalize?: boolean;
  underlined?: boolean;
  strikethrough?: boolean;
  // todo
  obfuscated?: boolean;
}

const colorStyles: StylesMap<Color> = {
  black: styles.rootBlack,
  dark_blue: styles.rootDarkBlue,
  dark_green: styles.rootDarkGreen,
  dark_aqua: styles.rootDarkAqua,
  dark_red: styles.rootDarkRed,
  dark_purple: styles.rootDarkPurple,
  gold: styles.rootGold,
  gray: styles.rootGray,
  dark_gray: styles.rootDarkGray,
  blue: styles.rootBlue,
  green: styles.rootGreen,
  aqua: styles.rootAqua,
  red: styles.rootRed,
  light_purple: styles.rootLightPurple,
  yellow: styles.rootYellow,
  white: styles.rootWhite,
  minecoin_gold: styles.rootMinecoinGold,
  material_quartz: styles.rootMaterialQuartz,
  material_iron: styles.rootMaterialIron,
  material_netherite: styles.rootMaterialNetherite,
  material_redstone: styles.rootMaterialRedstone,
  material_copper: styles.rootMaterialCopper,
  material_gold: styles.rootMaterialGold,
  material_emerald: styles.rootMaterialEmerald,
  material_diamond: styles.rootMaterialDiamond,
  material_lapis: styles.rootMaterialLapis,
  material_amethyst: styles.rootMaterialAmethyst,
};

const colorCodeStyles: StylesMap<ColorCode> = {
  '0': styles.rootBlack,
  '1': styles.rootDarkBlue,
  '2': styles.rootDarkGreen,
  '3': styles.rootDarkAqua,
  '4': styles.rootDarkRed,
  '5': styles.rootDarkPurple,
  '6': styles.rootGold,
  '7': styles.rootGray,
  '8': styles.rootDarkGray,
  '9': styles.rootBlue,
  'a': styles.rootGreen,
  'b': styles.rootAqua,
  'c': styles.rootRed,
  'd': styles.rootLightPurple,
  'e': styles.rootYellow,
  'f': styles.rootWhite,
  'g': styles.rootMinecoinGold,
  'h': styles.rootMaterialQuartz,
  'i': styles.rootMaterialIron,
  'j': styles.rootMaterialNetherite,
  'm': styles.rootMaterialRedstone,
  'n': styles.rootMaterialCopper,
  'p': styles.rootMaterialGold,
  'q': styles.rootMaterialEmerald,
  's': styles.rootMaterialDiamond,
  't': styles.rootMaterialLapis,
  'u': styles.rootMaterialAmethyst,
};

export const Typography = ({
  Component = 'span',
  color,
  bold,
  italic,
  underlined,
  strikethrough,
  shadow = true,
  normalize = true,
  style,
  ...restProps
}: TypographyProps): JSX.Element => {
  return (
    <RootComponent
      baseClassName={classNames(
        styles.root,
        bold && styles.rootBold,
        shadow && styles.rootShadow,
        italic && styles.rootItalic,
        normalize && styles.rootNormalize,
        // todo handle custom hex value for shadow -> getColorShadow MessageFormatted
        colorStyles[color] || colorCodeStyles[color],
      )}
      style={{
        textDecoration: classNames(underlined && 'underline', strikethrough && 'line-through'),
        ...style,
      }}
      {...restProps}
    />
  );
};
