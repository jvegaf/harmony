import "vitest-dom/extend-expect";
import { expect } from "vitest";

import * as matchers from "vitest-dom/matchers";

// extends Vitest's expect method with methods from react-testing-library
expect.extend(matchers);
