import React from "react";

export interface OfficialLicenseIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export const OfficialLicenseIcon: React.FC<OfficialLicenseIconProps> = ({
  className = "w-4 h-4 text-amber-500",
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
      <path
        fill="currentColor"
        d="M12 0c4.4183 0 8 3.58172 8 8 0 2.9606 -1.6095 5.5433 -4 6.9268V24l-4 -3 -4 3v-9.0732C5.60951 13.5433 4 10.9606 4 8c0 -4.41828 3.58172 -8 8 -8m0 2C8.68629 2 6 4.68629 6 8c0 3.3137 2.68629 6 6 6 3.3137 0 6 -2.6863 6 -6 0 -3.31371 -2.6863 -6 -6 -6m1.3096 4.19141L16 6.35742l-1.9717 2.41992 0.8291 2.72266L12 10.167 9.14258 11.5l0.8291 -2.72266L8 6.35742l2.6904 -0.16601L12 3.5z"
        strokeWidth="1"
      />
    </svg>
  );
};

export default OfficialLicenseIcon;
