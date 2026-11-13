// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { Calendar } from "../../components/ui/calendar";
import i18n from "../../i18n";
import { CampaignBuilderPage } from "../../pages/campaign-builder";
import { formatUiDate, translateUi } from "../ui-text";

beforeEach(async () => {
  await i18n.changeLanguage("es-MX");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [] }))));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Spanish legacy interface coverage", () => {
  it("renders calendar navigation and month names in Spanish and English", async () => {
    render(<Calendar month={new Date(2026, 10, 1)} />);
    expect(screen.getByLabelText("Mes siguiente")).toBeDefined();
    expect(screen.getByText(/noviembre/i)).toBeDefined();
    await act(async () => {
      await i18n.changeLanguage("en-US");
    });
    expect(screen.getByLabelText("Next month")).toBeDefined();
    expect(screen.getByText(/november/i)).toBeDefined();
  });

  it("renders a default validation issue in the current language after a switch", async () => {
    const parsed = z.number().int().min(1).safeParse(0);
    if (parsed.success) throw new Error("Expected invalid fixture");
    const token = parsed.error.issues[0]?.message;
    expect(translateUi(token)).toBe("Debe ser mayor o igual que 1");
    await i18n.changeLanguage("en-US");
    expect(translateUi(token)).toBe("Must be at least 1");
  });

  it("renders campaign headings, constant labels, descriptions, and navigation in Spanish", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <CampaignBuilderPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByText("Nueva campaña")).toBeDefined();
    expect(screen.getByText("Tipo de campaña")).toBeDefined();
    expect(screen.getByText("Puntos extra")).toBeDefined();
    expect(
      screen.getByText("Otorga puntos extra por eventos que cumplan los requisitos"),
    ).toBeDefined();
    expect(screen.getByText("Siguiente")).toBeDefined();
    expect(screen.queryByText("New Campaign")).toBeNull();
    await act(async () => {
      await i18n.changeLanguage("en-US");
    });
    expect(screen.getByText("New Campaign")).toBeDefined();
    expect(screen.getByText("Campaign Type")).toBeDefined();
    expect(screen.getByText("Bonus Points")).toBeDefined();
    client.clear();
  });

  it("translates validation and display enums without modifying identifiers or member data", async () => {
    expect(formatUiDate(new Date(2026, 10, 13, 12), "MMMM")).toBe("noviembre");
    expect(translateUi("interface.nameIsRequired")).toBe("El nombre es obligatorio");
    expect(translateUi("interface.pending2")).toBe("Pendiente");
    expect(translateUi("Member-provided reward name")).toBe("Member-provided reward name");
    expect(translateUi("mem_123")).toBe("mem_123");
    expect(translateUi("https://example.com")).toBe("https://example.com");
    await i18n.changeLanguage("en-US");
    expect(translateUi("interface.nameIsRequired")).toBe("Name is required");
  });
});
