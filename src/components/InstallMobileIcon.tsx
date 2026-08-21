import React from "react";

export interface InstallMobileIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export const InstallMobileIcon: React.FC<InstallMobileIconProps> = ({
  className = "w-4 h-4",
  ...props
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      id="Install-Mobile-Fill--Streamline-Rounded-Fill-Material"
      className={className}
      {...props}
    >
      <desc>
        Install Mobile Fill Streamline Icon: https://streamlinehq.com
      </desc>
      <path
        fill="currentColor"
        d="M6.5 23c-0.4 0 -0.75 -0.15 -1.05 -0.45 -0.3 -0.3 -0.45 -0.65 -0.45 -1.05V2.5c0 -0.4 0.15 -0.75 0.45 -1.05 0.3 -0.3 0.65 -0.45 1.05 -0.45h7.25c0.21665 0 0.39585 0.070835 0.5375 0.2125 0.14165 0.141665 0.2125 0.320835 0.2125 0.5375V4c0 0.216665 -0.07085 0.395835 -0.2125 0.5375 -0.14165 0.141665 -0.32085 0.2125 -0.5375 0.2125H6.5v14.5h11v-2.5c0 -0.21665 0.07085 -0.39585 0.2125 -0.5375S18.03335 16 18.25 16c0.21665 0 0.39585 0.07085 0.5375 0.2125S19 16.53335 19 16.75V21.5c0 0.4 -0.15 0.75 -0.45 1.05 -0.3 0.3 -0.65 0.45 -1.05 0.45H6.5Zm11.1 -12.225V4c0 -0.216665 0.07085 -0.395835 0.2125 -0.5375 0.14165 -0.141665 0.32085 -0.2125 0.5375 -0.2125 0.21665 0 0.39585 0.070835 0.5375 0.2125 0.14165 0.141665 0.2125 0.320835 0.2125 0.5375v6.775l2.325 -2.3c0.15 -0.13335 0.325 -0.20415 0.525 -0.2125 0.2 -0.00835 0.375 0.0625 0.525 0.2125 0.15 0.15 0.225 0.325 0.225 0.525s-0.075 0.375 -0.225 0.525l-3.6 3.6c-0.15 0.15 -0.325 0.225 -0.525 0.225s-0.375 -0.075 -0.525 -0.225l-3.6 -3.6c-0.15 -0.15 -0.225 -0.325 -0.225 -0.525s0.075 -0.375 0.225 -0.525c0.15 -0.15 0.325 -0.225 0.525 -0.225s0.375 0.075 0.525 0.225l2.325 2.3Z"
        strokeWidth="0.5"
      />
    </svg>
  );
};

export default InstallMobileIcon;
