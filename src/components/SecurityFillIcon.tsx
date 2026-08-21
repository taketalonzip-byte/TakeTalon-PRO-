import React from "react";

export interface SecurityFillIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export const SecurityFillIcon: React.FC<SecurityFillIconProps> = ({
  className = "w-4 h-4 text-emerald-500",
  ...props
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      className={className}
      height="24"
      width="24"
      {...props}
    >
      <g id="security-fill">
        <path
          id="Union"
          fill="currentColor"
          d="M10.9033 2.35693c0.7049 -0.27685 1.4885 -0.27685 2.1934 0l5.6347 2.21387C19.4966 4.87157 20 5.60993 20 6.43213v4.81837c-0.0001 4.6438 -2.775 8.6602 -6.9629 10.4228 -0.6629 0.279 -1.4113 0.279 -2.0742 0C6.77499 19.9107 4.00014 15.8943 4 11.2505V6.43213c0 -0.82219 0.50337 -1.56056 1.26855 -1.86133zM12 4.14893c-0.1239 0 -0.2479 0.02329 -0.3652 0.06933L6 6.43213v4.81837c0.00001 0.2524 0.0107 0.5025 0.03027 0.75H12v7.8808c0.0887 0 0.1775 -0.0167 0.2607 -0.0517 3.2379 -1.3628 5.4327 -4.3338 5.709 -7.8291H12z"
          strokeWidth="1"
        />
      </g>
    </svg>
  );
};

export default SecurityFillIcon;
