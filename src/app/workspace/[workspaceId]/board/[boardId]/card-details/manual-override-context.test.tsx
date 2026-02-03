import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  ManualOverrideProvider,
  useManualOverrideContext,
} from "./manual-override-context";

const TestComponent: React.FC = () => {
  const {
    setManualOverrideFlag,
    isManualOverrideActive,
    clearManualOverrideFlags,
  } = useManualOverrideContext();
  return (
    <div>
      <span data-testid="status">
        {isManualOverrideActive("jml cutting") ? "active" : "inactive"}
      </span>
      <button onClick={() => setManualOverrideFlag("Jml Cutting")}>
        Set Override
      </button>
      <button onClick={clearManualOverrideFlags}>Clear Overrides</button>
    </div>
  );
};

describe("ManualOverrideContext", () => {
  it("tracks manual override state and clears it", () => {
    render(
      <ManualOverrideProvider>
        <TestComponent />
      </ManualOverrideProvider>
    );

    const status = screen.getByTestId("status");
    expect(status.textContent).toBe("inactive");

    fireEvent.click(screen.getByText("Set Override"));
    expect(status.textContent).toBe("active");

    fireEvent.click(screen.getByText("Clear Overrides"));
    expect(status.textContent).toBe("inactive");
  });
});
