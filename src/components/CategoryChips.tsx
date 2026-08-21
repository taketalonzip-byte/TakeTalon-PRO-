/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

interface CategoryChipsProps {
  selectedSport: string;
  setSelectedSport: (sport: string) => void;
  selectedLeague: string;
  setSelectedLeague: (league: string) => void;
  selectedSubLeague: string;
  setSelectedSubLeague: (subLeague: string) => void;
  theme: "blue" | "dark" | "light";
  lang?: "en" | "fr" | "sw";
  onSportNavigate?: (sport: string) => void;
}

// ---------------------------------------------------------
// CUSTOM SVG ICONS FROM USER REQUEST
// ---------------------------------------------------------

// Filter Icon for "All" sport selection
const FilterIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 256 256"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    width="100%"
    height="100%"
  >
    <path d="M227.81,66.76l-.08.09L160,139.17v55.49A16,16,0,0,1,152.87,208l-32,21.34A16,16,0,0,1,96,216V139.17L28.27,66.85l-.08-.09A16,16,0,0,1,40,40H216a16,16,0,0,1,11.84,26.76Z" />
  </svg>
);

// All & Football Icon (Solar Football)
const FootballIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    width="100%"
    height="100%"
  >
    <path
      d="M6.01377 8.6655c-0.07054 -0.48631 -0.22134 -1.06519 -0.40176 -1.75777l-0.54076 -2.07601 -0.00953 -0.03659c0.71023 -0.68455 1.52144 -1.26483 2.40904 -1.71625L9.103 4.31685c0.55955 0.42442 1.03 0.78125 1.4465 1.02751 0.2181 0.12894 0.4377 0.23786 0.6668 0.31577v3.02192c-0.1232 0.05735 -0.2412 0.12943 -0.3514 0.21609L8.93257 10.4166c-0.07209 0.0567 -0.13896 0.118 -0.20044 0.1834L6.05397 9.44032c0.0162 -0.25319 -0.00177 -0.5099 -0.0402 -0.77482Z"
      fill="currentColor"
    ></path>
    <path
      d="M4.04498 10.2027c-0.29499 0.2541 -0.71032 0.5376 -1.33481 0.9617l-0.70394 0.4782c0.07149 -2.03737 0.75172 -3.91966 1.86419 -5.47019l0.27965 1.0736c0.19347 0.74275 0.32208 1.24077 0.37924 1.63482 0.05451 0.37579 0.03119 0.58236 -0.03014 0.74862 -0.06084 0.16491 -0.17456 0.33229 -0.45419 0.57325Z"
      fill="currentColor"
    ></path>
    <path
      d="M5.30099 16.8851c0.69457 0 1.28012 0 1.75848 0.0562 0.25228 0.0296 0.49324 0.0765 0.72304 0.154l1.41569 -1.8524c-0.05158 -0.1 -0.09448 -0.2056 -0.12765 -0.3161l-0.75896 -2.5264c-0.03761 -0.1252 -0.06143 -0.2522 -0.07209 -0.3791l-2.72657 -1.1807c-0.1423 0.1787 -0.30703 0.3418 -0.48886 0.4985 -0.36804 0.3171 -0.8558 0.6483 -1.4363 1.0426l-1.49144 1.0129c0.17461 1.2528 0.58106 2.4313 1.17455 3.4905l2.03011 0Z"
      fill="currentColor"
    ></path>
    <path
      d="M11.7917 10.0775c0.0541 -0.0424 0.1151 -0.0617 0.1746 -0.0617 0.0594 0 0.1205 0.0193 0.1745 0.0617l1.9323 1.5185c0.0516 0.0405 0.0908 0.0979 0.1113 0.166 0.0198 0.066 0.0207 0.1379 0 0.2068l-0.759 2.5265c-0.0209 0.0695 -0.0601 0.1247 -0.1078 0.1632 -0.0525 0.0425 -0.1144 0.0645 -0.178 0.0645h-2.3467c-0.0636 0 -0.1255 -0.022 -0.178 -0.0645 -0.0477 -0.0385 -0.0869 -0.0937 -0.1078 -0.1632l-0.75893 -2.5265c-0.0207 -0.0689 -0.01983 -0.1408 -0.00001 -0.2068 0.02048 -0.0681 0.05971 -0.1255 0.11124 -0.166l1.9323 -1.5185Z"
      fill="currentColor"
    ></path>
    <path
      d="M13.3757 5.37566c0.4217 -0.23698 0.8995 -0.5833 1.4678 -0.99515l1.7407 -1.26145c0.8648 0.44946 1.6556 1.0218 2.3494 1.69392l-0.5457 2.09486c-0.1804 0.69258 -0.3312 1.27145 -0.4017 1.75776 -0.0383 0.2635 -0.0562 0.51888 -0.0405 0.77075l-2.7423 1.16685c-0.0623 -0.0666 -0.1302 -0.129 -0.2034 -0.1866l-1.9323 -1.51846c-0.1103 -0.08666 -0.2283 -0.15874 -0.3514 -0.21609V5.67216c0.2256 -0.07258 0.4431 -0.17491 0.6594 -0.2965Z"
      fill="currentColor"
    ></path>
    <path
      d="M11.3129 4.05316c-0.3332 -0.19701 -0.7349 -0.50023 -1.33739 -0.95719l-0.88254 -0.66936C10.0094 2.14916 10.9815 2 11.9884 2c1.0326 0 2.0286 0.15686 2.9655 0.44808l-0.956 0.69279c-0.612 0.44348 -1.0199 0.73765 -1.3571 0.92716 -0.3205 0.18011 -0.5071 0.2239 -0.6662 0.22213 -0.1592 -0.00176 -0.3449 -0.04973 -0.6617 -0.237Z"
      fill="currentColor"
    ></path>
    <path
      d="M18.9759 11.3392c0.368 0.3171 0.8558 0.6483 1.4363 1.0426l1.4703 0.9986c-0.1735 1.2581 -0.5808 2.4415 -1.1765 3.5047l-1.8582 0c-0.6946 0 -1.2801 0 -1.7585 0.0562 -0.2628 0.0308 -0.5133 0.0804 -0.7517 0.1639l-1.5896 -1.8893c0.0455 -0.0919 0.0838 -0.1885 0.114 -0.2891l0.7589 -2.5264c0.0373 -0.1239 0.061 -0.2497 0.0718 -0.3753l2.7916 -1.1878c0.1429 0.1801 0.3086 0.3442 0.4916 0.5019Z"
      fill="currentColor"
    ></path>
    <path
      d="M14.8083 18.6265c-0.2018 0.4462 -0.386 1.0149 -0.6063 1.6948l-0.4963 1.5315c-0.5579 0.0968 -1.1317 0.1472 -1.7173 0.1472 -0.5222 0 -1.0351 -0.0401 -1.5357 -0.1175l-0.50591 -1.5612c-0.22029 -0.6799 -0.40457 -1.2486 -0.60635 -1.6948 -0.10303 -0.2278 -0.21763 -0.4404 -0.35557 -0.6342l1.39033 -1.8192c0.1345 0.0327 0.2745 0.0499 0.4177 0.0499h2.3467c0.1537 0 0.3037 -0.0199 0.4472 -0.0573l1.5588 1.8526c-0.1298 0.1867 -0.2388 0.3905 -0.3373 0.6082Z"
      fill="currentColor"
    ></path>
    <path
      d="M8.53263 20.8232c-0.23644 -0.7297 -0.39577 -1.2179 -0.55893 -1.5786 -0.15577 -0.3445 -0.28408 -0.4993 -0.41837 -0.5989 -0.13253 -0.0982 -0.31071 -0.1724 -0.67082 -0.2147 -0.38059 -0.0447 -0.87752 -0.0459 -1.62644 -0.0459h-0.95721c1.15795 1.3959 2.68797 2.4712 4.43774 3.0737l-0.20597 -0.6356Z"
      fill="currentColor"
    ></path>
    <path
      d="M17.2643 18.431c0.3805 -0.0447 0.8775 -0.0459 1.6264 -0.0459h0.7853c-1.1149 1.3439 -2.5747 2.3908 -4.2434 3.0045l0.1835 -0.5664c0.2365 -0.7297 0.3958 -1.2179 0.559 -1.5786 0.1557 -0.3445 0.284 -0.4993 0.4183 -0.5989 0.1326 -0.0982 0.3107 -0.1724 0.6709 -0.2147Z"
      fill="currentColor"
    ></path>
    <path
      d="M19.4706 8.88093c0.0572 -0.39405 0.1858 -0.89207 0.3793 -1.63482l0.2735 -1.05001c1.0995 1.54194 1.7725 3.40966 1.8466 5.4305l-0.6802 -0.4621c-0.6245 -0.4241 -1.0399 -0.7076 -1.3348 -0.9617 -0.2797 -0.24096 -0.3934 -0.40834 -0.4542 -0.57325 -0.0614 -0.16626 -0.0847 -0.37283 -0.0302 -0.74862Z"
      fill="currentColor"
    ></path>
  </svg>
);

// Basketball Icon (as specified by user)
const BasketballIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 256 256"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    width="100%"
    height="100%"
  >
    <path d="M93.27,36.86a4,4,0,0,1,.82-7.19,103.94,103.94,0,0,1,88.66,9.95,4,4,0,0,1,1,5.87,153.32,153.32,0,0,1-41.89,37A169.43,169.43,0,0,0,93.27,36.86ZM127.58,90a153,153,0,0,0-56-46.91,3.94,3.94,0,0,0-4,.33,104.41,104.41,0,0,0-38.34,52,4,4,0,0,0,3,5.16A152.34,152.34,0,0,0,64,104,151,151,0,0,0,127.58,90Zm103.8,26.69A103.81,103.81,0,0,0,202.19,55.2a4,4,0,0,0-6,.34,169.15,169.15,0,0,1-45.69,40.4,167.73,167.73,0,0,1,13.55,29.9A167.64,167.64,0,0,1,208,120,169.35,169.35,0,0,1,227,121.07,4,4,0,0,0,231.38,116.72Zm-62.91,24.5a167.7,167.7,0,0,1,4.45,38.47,168,168,0,0,1-4.11,36.85A4,4,0,0,0,174.5,221a104.25,104.25,0,0,0,56.57-79.25,4,4,0,0,0-3.49-4.49,152.44,152.44,0,0,0-59.11,4Zm-19.64-10.45a151.76,151.76,0,0,0-12.39-27.21A167,167,0,0,1,64,120a168.4,168.4,0,0,1-34.88-3.65,4,4,0,0,0-4.81,3.56q-.31,4-.32,8.09a103.72,103.72,0,0,0,33,75.91,4,4,0,0,0,6.15-.92A169,169,0,0,1,148.83,130.77ZM75.69,213.25a4,4,0,0,0,1.52,5.48,103.88,103.88,0,0,0,68.85,11.69,3.93,3.93,0,0,0,3.06-2.65,152.6,152.6,0,0,0,7.8-48.08,151.3,151.3,0,0,0-3.74-33.46A152.94,152.94,0,0,0,75.69,213.25Z" />
  </svg>
);

// Volleyball Icon (as specified by user)
const VolleyballIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 256 256"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    width="100%"
    height="100%"
  >
    <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm87.63,96H181.37a104.18,104.18,0,0,0-35.78-78.23A88.18,88.18,0,0,1,215.63,120ZM44.53,155.87A87.95,87.95,0,0,1,77.27,56.13L94.39,85.78a104.14,104.14,0,0,0-49.86,70.09ZM58.9,182.43a88,88,0,0,1,43.49-82.79L118.76,128,77.27,199.87A88.62,88.62,0,0,1,58.9,182.43Zm150.84-21.85a88,88,0,0,1-93.49,3.78L132.62,136h83A87.16,87.16,0,0,1,209.74,160.58Z" />
  </svg>
);

// Tennis Icon (as specified by user)
const TennisIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 256 256"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    width="100%"
    height="100%"
  >
    <path d="M24.81,115.41a103.9,103.9,0,0,1,90.6-90.65,4,4,0,0,1,4.47,3.79,87.82,87.82,0,0,1-91.27,91.33A4,4,0,0,1,24.81,115.41Zm202.54,20.7c-1.12,0-2.23-.07-3.35-.07a87.84,87.84,0,0,0-87.88,91.41,4,4,0,0,0,4.47,3.79,103.9,103.9,0,0,0,90.6-90.66A4,4,0,0,0,227.35,136.11Zm-76.89,14.35A103.33,103.33,0,0,1,224,120c1,0,2.06,0,3.09,0a4,4,0,0,0,4.12-4.43,103.91,103.91,0,0,0-90.88-90.89,4,4,0,0,0-4.43,4.12,103.72,103.72,0,0,1-30.36,76.7A103.33,103.33,0,0,1,32,136c-1,0-2.06,0-3.09,0a4,4,0,0,0-4.12,4.43,103.91,103.91,0,0,0,90.88,90.89,4,4,0,0,0,4.43-4.12A103.72,103.72,0,0,1,150.46,150.46Z" />
  </svg>
);

// Ice Hockey Icon (Custom vector perfectly representing the crossed sticks and puck in PNG attachment)
const HockeyIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 256 256"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    width="100%"
    height="100%"
  >
    <path d="M149.9,122.82l68-80a8,8,0,0,1,12.2,10.36l-68,80a8,8,0,1,1-12.2-10.36ZM240,168v32a16,16,0,0,1-16,16H171.7a16,16,0,0,1-12.19-5.64L25.9,53.18h0A8,8,0,0,1,38.1,42.82L130.9,152H224a16,16,0,0,1,16,16Zm-16,0H208v32h16ZM115.3,183.06a4,4,0,0,1,0,5.18L96.49,210.36A16,16,0,0,1,84.3,216H32a16,16,0,0,1-16-16V168a16,16,0,0,1,16-16H87.05a4,4,0,0,1,3,1.41ZM48,168H32v32H48Z" />
  </svg>
);

// Rugby Icon (as specified by user)
const RugbyIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 256 256"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    width="100%"
    height="100%"
  >
    <path d="M229.06,53.89a32.92,32.92,0,0,0-26.95-26.95c-32.38-5.49-93.39-8-138.27,36.9s-42.39,105.9-36.9,138.27a32.92,32.92,0,0,0,27,26.95A206.58,206.58,0,0,0,88.27,232c32.09,0,72.05-8,103.89-39.84C237.05,147.28,234.55,86.26,229.06,53.89ZM56.56,213.3A16.94,16.94,0,0,1,42.7,199.44a180.27,180.27,0,0,1-2.11-46.9l62.87,62.87A180.27,180.27,0,0,1,56.56,213.3ZM165.64,101.67,151.3,116l6.34,6.34a8,8,0,1,1-11.31,11.3L140,127.31,127.31,140l6.34,6.34a8,8,0,1,1-11.3,11.31L116,151.3l-14.34,14.34a8,8,0,1,1-11.31-11.31L104.7,140l-6.34-6.34a8,8,0,0,1,11.31-11.3l6.34,6.34L128.69,116l-6.34-6.34a8,8,0,0,1,11.3-11.31L140,104.7l14.34-14.34a8,8,0,1,1,11.31,11.31Zm49.77,1.79L152.54,40.59c4.76-.44,9.72-.69,14.91-.69a192,192,0,0,1,32,2.8A16.94,16.94,0,0,1,213.3,56.56,180.27,180.27,0,0,1,215.41,103.46Z" />
  </svg>
);

// Baseball Icon (as specified by user)
const BaseballIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 256 256"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    width="100%"
    height="100%"
  >
    <path d="M128,24A104.12,104.12,0,0,0,24,128v56a24,24,0,0,0,24,24,24.11,24.11,0,0,0,14.18-4.64C74.33,194.53,95.6,184,128,184s53.67,10.52,65.81,19.35A24,24,0,0,0,232,184V128A104.12,104.12,0,0,0,128,24ZM40,128A88.15,88.15,0,0,1,109.81,41.9a167,167,0,0,0-28.87,76.76A166,166,0,0,0,40,136.88Zm176,56a7.77,7.77,0,0,1-4.34,7.1,8,8,0,0,1-8.44-.69C189.16,180.2,164.7,168,128,168S66.84,180.2,52.78,190.42a8,8,0,0,1-8.44.69A7.77,7.77,0,0,1,40,184V156.07a150.62,150.62,0,0,1,49.93-23.28,7.06,7.06,0,0,0,1-.26,154.06,154.06,0,0,1,74.17,0,8.64,8.64,0,0,0,1,.27A150.49,150.49,0,0,1,216,156.07Zm0-47.13a166,166,0,0,0-40.94-18.22A167,167,0,0,0,146.19,41.9,88.15,88.15,0,0,1,216,128Z" />
  </svg>
);

// ---------------------------------------------------------
// ADDITIONAL SPORT ICONS DEFINED FOR DESIGN COHESION
// ---------------------------------------------------------

const CricketIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 256 256"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    width="100%"
    height="100%"
  >
    <path d="M243.31,81.37,190.63,28.69a16,16,0,0,0-22.63,0L60.69,136a16,16,0,0,0,0,22.63l20.68,20.68-47,47a8,8,0,0,0,11.32,11.32l47-47,20.68,20.68a16,16,0,0,0,22.63,0L243.31,104a16,16,0,0,0,0-22.63ZM124.69,200,104,179.31l29.66-29.65a8,8,0,0,0-11.32-11.32L92.69,168,72,147.31,107.31,112H160v52.69ZM32,60A28,28,0,1,1,60,88,28,28,0,0,1,32,60Z" />
  </svg>
);

const HandballIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 256 256"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    width="100%"
    height="100%"
  >
    <path d="M219.31,98.46A88,88,0,1,1,67.08,186.77h0L26.15,115.88a16,16,0,0,1,27.69-16L72.4,132a8,8,0,0,0,13.86-8L47,56A16,16,0,0,1,74.69,40L114,108a8,8,0,1,0,13.85-8l-30-52a16,16,0,0,1,27.71-16L166,102.12A48.25,48.25,0,0,0,152,136a47.59,47.59,0,0,0,9.6,28.8,8,8,0,1,0,12.79-9.61A32,32,0,0,1,181,110.26a8,8,0,0,0,13.85-10.43L171.71,80a16,16,0,0,1,27.71-16l19.89,34.46Zm-29.37-57A43.74,43.74,0,0,1,216.74,62l.33.57a8,8,0,0,0,13.86-8L230.6,54a59.64,59.64,0,0,0-36.54-28,8,8,0,0,0-4.12,15.46ZM79.58,225.72A103.58,103.58,0,0,1,53.93,196a8,8,0,0,0-13.86,8,119.56,119.56,0,0,0,29.6,34.28,8,8,0,0,0,9.91-12.56Z" />
  </svg>
);

const BoxingIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 256 256"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    width="100%"
    height="100%"
  >
    <path d="M168,16H120A56,56,0,0,0,64,72v31.73A8.17,8.17,0,0,1,56.53,112,8,8,0,0,1,48,104V78.7a4,4,0,0,0-5.63-3.65A32,32,0,0,0,24,104v29.19a16.14,16.14,0,0,0,3.5,10q.3.36.63.69L64,179.34V216a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V177.12l15.38-53.84a16,16,0,0,0,.62-4.4V72A56,56,0,0,0,168,16Zm3.58,168.84a8,8,0,0,1-7.16,14.32L136,184.94l-28.42,14.22a8,8,0,1,1-7.16-14.32L118.11,176l-17.69-8.84a8,8,0,1,1,7.16-14.32L136,167.06l28.42-14.22a8,8,0,1,1,7.16,14.32L153.89,176Z" />
  </svg>
);

const MmaIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M12 22l8-4V6l-8-4-8 4v12z" />
    <path d="M12 6v12M6 12h12" strokeWidth="1.5" opacity="0.6" />
    <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
  </svg>
);

const GolfIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 256 256"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    width="100%"
    height="100%"
  >
    <path d="M175.47,197.14a8,8,0,0,1-4.61,10.33A125.91,125.91,0,0,1,136,215.68V248a8,8,0,0,1-16,0V215.68a125.91,125.91,0,0,1-34.86-8.21,8,8,0,1,1,5.72-14.94C104,197.56,116.15,200,128,200s24-2.44,37.14-7.47A8,8,0,0,1,175.47,197.14ZM216,96A88,88,0,1,1,128,8,88.1,88.1,0,0,1,216,96Zm-72,36a12,12,0,1,0-12,12A12,12,0,0,0,144,132Zm32-32a12,12,0,1,0-12,12A12,12,0,0,0,176,100Z" />
  </svg>
);

const SnookerIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path
      d="M12 6l5 8.5c.3.5 0 1.2-.6 1.2H7.6c-.6 0-.9-.7-.6-1.2L12 6z"
      fill="currentColor"
      fillOpacity="0.1"
    />
    <circle cx="12" cy="9" r="1" fill="currentColor" stroke="none" />
    <circle cx="10" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="14" cy="12" r="1" fill="currentColor" stroke="none" />
    <path d="M4 20l5-5" />
  </svg>
);

const TableTennisIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="10" cy="10" r="5" fill="currentColor" fillOpacity="0.1" />
    <path d="M6.5 13.5L3 21a1 1 0 0 0 1.4 1.4l7.5-3.5" />
    <circle cx="17" cy="10" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);

const TrophyIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    width="100%"
    height="100%"
  >
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34" />
    <path
      d="M12 2a6 6 0 0 1 6 6c0 3.3-2 6-6 6s-6-2.7-6-6a6 6 0 0 1 6-6z"
      fill="currentColor"
      fillOpacity="0.15"
    />
  </svg>
);

// ---------------------------------------------------------
// CATEGORY COMPONENT CONFIG
// ---------------------------------------------------------

const SPORTS_LIST = [
  { id: "All", name: "All" },
  { id: "Football", name: "Football" },
  { id: "Basketball", name: "Basketball" },
  { id: "Tennis", name: "Tennis" },
  { id: "Volleyball", name: "Volleyball" },
  { id: "Ice Hockey", name: "Ice Hockey" },
  { id: "Rugby", name: "Rugby" },
  { id: "Baseball", name: "Baseball" },
  { id: "Cricket", name: "Cricket" },
  { id: "Handball", name: "Handball" },
  { id: "Boxing", name: "Boxing" },
  { id: "Golf", name: "Golf" },
];

const getSportLabel = (id: string, lang: "en" | "fr" | "sw" = "en") => {
  if (lang === "sw") {
    switch (id) {
      case "All":
        return "Yote";
      case "Football":
        return "Soka";
      case "Basketball":
        return "Kikapu";
      case "Tennis":
        return "Tenisi";
      case "Volleyball":
        return "Voliboli";
      case "Ice Hockey":
        return "Hoki ya Barafu";
      case "Rugby":
        return "Raga";
      case "Baseball":
        return "Besiboli";
      case "Cricket":
        return "Kriketi";
      case "Handball":
        return "Mpira wa Mikono";
      case "Boxing":
        return "Ngumi";
      case "MMA":
        return "MMA";
      case "Golf":
        return "Gofu";
      case "Snooker":
        return "Snoka";
      case "Table Tennis":
        return "Tenisi ya Mezani";
      default:
        return id;
    }
  } else if (lang === "fr") {
    switch (id) {
      case "All":
        return "Tous";
      case "Football":
        return "Football";
      case "Basketball":
        return "Basketball";
      case "Tennis":
        return "Tennis";
      case "Volleyball":
        return "Volley-ball";
      case "Ice Hockey":
        return "Hockey sur Glace";
      case "Rugby":
        return "Rugby";
      case "Baseball":
        return "Baseball";
      case "Cricket":
        return "Cricket";
      case "Handball":
        return "Handball";
      case "Boxing":
        return "Boxe";
      case "MMA":
        return "MMA";
      case "Golf":
        return "Golf";
      case "Snooker":
        return "Billard";
      case "Table Tennis":
        return "Tennis de Table";
      default:
        return id;
    }
  }
  return id;
};

// Map each ID to its respective custom SVG Icon
const renderSportIcon = (id: string, className: string) => {
  switch (id) {
    case "All":
      return <FilterIcon className={className} />;
    case "Football":
      return <FootballIcon className={className} />;
    case "Basketball":
      return <BasketballIcon className={className} />;
    case "Tennis":
      return <TennisIcon className={className} />;
    case "Volleyball":
      return <VolleyballIcon className={className} />;
    case "Ice Hockey":
      return <HockeyIcon className={className} />;
    case "Rugby":
      return <RugbyIcon className={className} />;
    case "Baseball":
      return <BaseballIcon className={className} />;
    case "Cricket":
      return <CricketIcon className={className} />;
    case "Handball":
      return <HandballIcon className={className} />;
    case "Boxing":
      return <BoxingIcon className={className} />;
    case "MMA":
      return <MmaIcon className={className} />;
    case "Golf":
      return <GolfIcon className={className} />;
    case "Snooker":
      return <SnookerIcon className={className} />;
    case "Table Tennis":
      return <TableTennisIcon className={className} />;
    default:
      return <FootballIcon className={className} />;
  }
};

const CategoryChips = React.memo(function CategoryChips({
  selectedSport,
  setSelectedSport,
  setSelectedLeague,
  setSelectedSubLeague,
  theme,
  lang = "en",
  onSportNavigate,
}: CategoryChipsProps) {
  const handleSportChange = (sportId: string) => {
    if (onSportNavigate && sportId !== "All") {
      onSportNavigate(sportId);
      return;
    }
    setSelectedSport(sportId);
    setSelectedLeague("All");
    setSelectedSubLeague("All");
  };

  return (
    <div className="px-0 pt-0.5 pb-0.5 animate-fadeIn select-none">
      <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-0.5 px-3 -mx-3 scroll-smooth [touch-action:pan-x_pan-y]">
        {SPORTS_LIST.map((sport) => {
          const isSelected = selectedSport === sport.id;

          return (
            <button
              key={sport.id}
              id={`sport-chip-${sport.id.toLowerCase().replace(/\s+/g, "-")}`}
              onClick={() => handleSportChange(sport.id)}
              className={`w-[52px] h-[52px] min-w-[52px] shrink-0 flex flex-col items-center justify-center p-1 rounded-xl transition-all duration-200 cursor-pointer text-center touch-manipulation select-none border ${
                isSelected
                  ? theme === "light"
                    ? "bg-blue-600 border-blue-600 text-white shadow-[0_2px_6px_rgba(37,99,235,0.18)] font-black"
                    : theme === "blue"
                      ? "bg-[#38bdf8] border-[#38bdf8] text-[#050912] shadow-[0_2px_8px_rgba(56,189,248,0.22)] font-black"
                      : "bg-[#38bdf8] border-[#38bdf8] text-slate-950 shadow-[0_2px_8px_rgba(56,189,248,0.22)] font-black"
                  : theme === "light"
                    ? "bg-gradient-to-br from-[#f8fbfe] via-[#f0f5fc] to-[#e6effa] border-slate-200/90 hover:from-[#ffffff] hover:via-[#f4f8fe] hover:to-[#edf4fc] hover:border-blue-300/70 text-slate-700 hover:text-slate-900 shadow-sm"
                    : theme === "blue"
                      ? "bg-[#3B6D99] border-blue-400/40 text-blue-100/90 hover:text-white"
                      : "bg-[#0d0d0d] border-neutral-800/60 text-slate-400 hover:text-slate-100"
              }`}
            >
              {/* Centered Premium SVG Icon */}
              <div
                className={`w-5 h-5 transition-transform duration-200 flex items-center justify-center ${
                  isSelected ? "scale-105" : ""
                }`}
                style={{
                  color: isSelected ? undefined : theme === "light" ? "#2563eb" : "#38bdf8",
                }}
              >
                {renderSportIcon(sport.id, "w-full h-full")}
              </div>

              {/* Centered Category Name */}
              <span
                className={`text-[7px] leading-tight mt-1 font-bold block max-w-full truncate text-ellipsis break-words px-0.5 uppercase tracking-wide ${
                  isSelected ? "font-black" : ""
                }`}
              >
                {getSportLabel(sport.id, lang)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
});
export default CategoryChips;
