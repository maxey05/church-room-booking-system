"use client";

import type { MouseEvent } from "react";

export default function DateField({
  name,
  defaultValue,
  className,
  required,
}: {
  name: string;
  defaultValue: string;
  className: string;
  required?: boolean;
}) {
  function open(e: MouseEvent<HTMLInputElement>) {
    try {
      e.currentTarget.showPicker?.();
    } catch {}
  }

  return (
    <input
      type="date"
      name={name}
      defaultValue={defaultValue}
      required={required}
      onClick={open}
      className={`${className} cursor-pointer`}
    />
  );
}
