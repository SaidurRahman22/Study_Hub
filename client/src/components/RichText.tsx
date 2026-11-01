import { createElement, type ElementType } from "react";

type RichTextProps = {
  text?: string;
  as?: ElementType;
  className?: string;
};

export default function RichText({ text = "", as = "span", className }: RichTextProps) {
  return createElement(as, {
    className,
    dangerouslySetInnerHTML: { __html: text },
  });
}
