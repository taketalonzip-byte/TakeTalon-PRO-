import React from "react";

export interface HelpQuestionIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export const HelpQuestionIcon: React.FC<HelpQuestionIconProps> = ({
  className = "w-4 h-4 text-teal-400",
  ...props
}) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      id="Question-Circle--Streamline-Solar-Ar"
      className={className}
      height="24"
      width="24"
      {...props}
    >
      <desc>Question Circle Streamline Icon: https://streamlinehq.com</desc>
      <path
        stroke="currentColor"
        d="M2 12a10 10 0 1 0 20 0 10 10 0 1 0 -20 0"
        strokeWidth="1.5"
      />
      <path
        d="M10.125 8.875C10.125 7.83947 10.9645 7 12 7c1.0355 0 1.875 0.83947 1.875 1.875 0 0.68745 -0.37 1.2885 -0.9216 1.6149 -0.4754 0.2812 -0.9534 0.7078 -0.9534 1.2601V13"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
      <path
        fill="currentColor"
        d="M11 16a1 1 0 1 0 2 0 1 1 0 1 0 -2 0"
        strokeWidth="1.5"
      />
    </svg>
  );
};

export default HelpQuestionIcon;
