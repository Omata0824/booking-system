"use client";

import { useState } from "react";

type TimeSelectFieldProps = {
  name: string;
  value: string;
  options: string[];
};

export function TimeSelectField({ name, value, options }: TimeSelectFieldProps) {
  const [selected, setSelected] = useState(value);

  return (
    <select
      className="block w-full rounded-xl border border-slate-300 px-3 py-2 font-normal outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
      name={name}
      onChange={(event) => setSelected(event.target.value)}
      value={selected}
    >
      {options.map((time) => (
        <option key={time} value={time}>
          {time}
        </option>
      ))}
    </select>
  );
}
