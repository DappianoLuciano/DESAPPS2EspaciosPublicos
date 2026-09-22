import { readLoggedLines } from "../helpers/logSpy";

const mockSendMail = jest.fn();

jest.mock("nodemailer", () => ({
  createTransport: () => ({ sendMail: mockSendMail })
}));

import { NodemailerEmailSender } from "../../src/infrastructure/email/NodemailerEmailSender";

describe("NodemailerEmailSender", () => {
  afterEach(() => {
    mockSendMail.mockReset();
  });

  it("envia el mail con los datos recibidos", async () => {
    mockSendMail.mockResolvedValue(undefined);
    const sender = new NodemailerEmailSender();

    await sender.send("citizen@test.com", "Reserva Confirmada - Código QR", "<p>Hola</p>");

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "citizen@test.com",
        subject: "Reserva Confirmada - Código QR",
        html: "<p>Hola</p>"
      })
    );
  });

  it("no relanza el error si falla el envio, solo lo loguea", async () => {
    mockSendMail.mockRejectedValue(new Error("Connection refused"));
    const write = jest.spyOn(process.stdout, "write").mockImplementation(() => true);
    const sender = new NodemailerEmailSender();

    await expect(
      sender.send("citizen@test.com", "Reserva Confirmada - Código QR", "<p>Hola</p>")
    ).resolves.toBeUndefined();

    const lines = readLoggedLines(write);
    expect(lines).toContainEqual(
      expect.objectContaining({
        msg: "[NodemailerEmailSender] No se pudo enviar el mail",
        to: "citizen@test.com"
      })
    );

    write.mockRestore();
  });
});
