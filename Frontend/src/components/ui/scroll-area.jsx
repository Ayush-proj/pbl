"use client";

import * as React from "react";

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

const ScrollArea = React.forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={classNames("relative overflow-hidden", className)}
    {...props}
  >
    <div className="h-full w-full overflow-y-auto overflow-x-hidden">
      {children}
    </div>
  </div>
));
ScrollArea.displayName = "ScrollArea";

export { ScrollArea };