import { mode } from '@chakra-ui/theme-tools';
const Card = {
  baseStyle: (props) => ({
    p: '20px',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    position: 'relative',
    borderRadius: '24px',
    minWidth: '0px',
    wordWrap: 'break-word',
    bg: mode('#ffffff', '#000000')(props),
    border: '1px solid',
    borderColor: mode('gray.200', 'whiteAlpha.300')(props),
    boxShadow: 'none',
    backgroundClip: 'border-box',
  }),
};

export const CardComponent = {
  components: {
    Card,
  },
};
