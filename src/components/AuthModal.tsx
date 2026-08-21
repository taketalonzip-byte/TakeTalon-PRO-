/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import AuthPage, { AuthPageProps } from "./AuthPage";

export type AuthModalProps = AuthPageProps;

export default function AuthModal(props: AuthPageProps) {
  if (!props.isOpen) return null;
  return <AuthPage {...props} />;
}
