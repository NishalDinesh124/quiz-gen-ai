import { mode } from "@chakra-ui/theme-tools";
export const globalStyles = {
  colors: {
    brand: {
      100: "#E9E3FF",
      200: "#422AFB",
      300: "#422AFB",
      400: "#7551FF",
      500: "#422AFB",
      600: "#3311DB",
      700: "#02044A",
      800: "#190793",
      900: "#11047A",
    },
    brandScheme: {
      100: "#E9E3FF",
      200: "#7551FF",
      300: "#7551FF",
      400: "#7551FF",
      500: "#422AFB",
      600: "#3311DB",
      700: "#02044A",
      800: "#190793",
      900: "#02044A",
    },
    brandTabs: {
      100: "#E9E3FF",
      200: "#422AFB",
      300: "#422AFB",
      400: "#422AFB",
      500: "#422AFB",
      600: "#3311DB",
      700: "#02044A",
      800: "#190793",
      900: "#02044A",
    },
    secondaryGray: {
      100: "#E0E5F2",
      200: "#E1E9F8",
      300: "#F4F7FE",
      400: "#E9EDF7",
      500: "#8F9BBA",
      600: "#A3AED0",
      700: "#707EAE",
      800: "#707EAE",
      900: "#1B2559",
    },
    red: {
      100: "#FEEFEE",
      500: "#EE5D50",
      600: "#E31A1A",
    },
    blue: {
      50: "#EFF4FB",
      500: "#3965FF",
    },
    orange: {
      100: "#FFF6DA",
      500: "#FFB547",
    },
    green: {
      100: "#E6FAF5",
      500: "#01B574",
    },
    navy: {
      50: "#d0dcfb",
      100: "#aac0fe",
      200: "#a3b9f8",
      300: "#728fea",
      400: "#3652ba",
      500: "#1b3bbb",
      600: "#24388a",
      700: "#1B254B",
      800: "#000000",
      900: "#000000",
    },
    gray: {
      50:"#eeeeeeff",
      100: "#f4f3f3ff",
      
    },
  },
  styles: {
    global: (props) => ({
      body: {
        overflowX: "hidden",
        overflowY: "scroll",
        scrollbargutter: "stable",
        bg: mode("white", "black")(props),
        fontFamily: "DM Sans",
        letterSpacing: "-0.5px",
      },
      "*": {
        scrollbarWidth: "thin",
        scrollbarColor: `${mode("#d6d6d6", "rgba(255, 255, 255, 0.25)")(
          props,
        )} transparent`,
      },
      "*::-webkit-scrollbar": {
        width: "6px",
        height: "6px",
      },
      "*::-webkit-scrollbar-track": {
        background: "transparent",
        borderRadius: "999px",
      },
      "*::-webkit-scrollbar-track-piece": {
        background: "transparent",
      },
      "*::-webkit-scrollbar-thumb": {
        background: mode("#d6d6d6", "rgba(255, 255, 255, 0.25)")(props),
        borderRadius: "999px",
      },
      "*::-webkit-scrollbar-thumb:hover": {
        background: mode("#c8c8c8", "rgba(255, 255, 255, 0.35)")(props),
      },
      input: {
        color: mode("gray.700", "white")(props),
      },
      html: {
        fontFamily: "DM Sans",
      },
    }),
  },
};
