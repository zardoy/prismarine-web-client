import { Meta, Story } from '@storybook/react';
import Book, { BookProps } from './Book';

export default {
  title: 'Components/Book',
  component: Book,
} as Meta;

const Template: Story<BookProps> = (args) => <Book {...args} />;

export const Default = Template.bind({});
Default.args = {
  textPages: [
    'Page 1: This is some text for page 1.',
    'Page 2: This is some text for page 2.',
    'Page 3: This is some text for page 3.',
  ],
  editable: true,
  onSign: (pages) => console.log('Signed with pages:', pages),
  onClose: () => console.log('Closed book'),
};