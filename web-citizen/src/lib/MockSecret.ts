export type MockSecret = {
  secret: string;
};

const mockSecrets: MockSecret[] = [
  { secret: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" },
  { secret: "0x0987654321fedcba0987654321fedcba0987654321fedcba0987654321fedcba" }
];
export default mockSecrets;