import * as fc from "fast-check";
import { expect, it } from "vitest";
import { validateTask } from "./task";

const padding = fc.array(fc.constantFrom(" ", "\t", "\n")).map((spaces) => spaces.join(""));

it("whitespace around a title never changes the verdict", () => {
  fc.assert(
    fc.property(fc.string(), padding, (title, pad) => {
      expect(validateTask({ title: pad + title + pad })).toBe(validateTask({ title }));
    }),
  );
});
