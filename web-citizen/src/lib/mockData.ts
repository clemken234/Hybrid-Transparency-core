export type CitizenSubject = {
  licenseID: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  licenseType: string;
  expirationDate: string;
  restrictions: string;
  conditions: string;
  bloodType: string;
  address: string;
};

export type MockCitizen = {
  subject: CitizenSubject;
  ltoSignature: string;
};

const mockCitizens: MockCitizen[] = [
  {
    subject: { licenseID: "N01-26-835232", firstName: "Lorena", lastName: "Morales", dateOfBirth: "2004-04-25", licenseType: "Non-Professional", expirationDate: "2033-02-04", restrictions: "None", conditions: "None", bloodType: "O+", address: "260 Busa St., Brgy. Krus na Ligas, Valenzuela" },
    ltoSignature: "0xab119927971a5af22622d2fd26945869df19686c1eecd55b5f9f55807836a5e7765c6a24ebe0c84a1836a7820dc28bef3f12dc31b",
  },
  {
    subject: { licenseID: "N01-26-462076", firstName: "Enrique", lastName: "Solis", dateOfBirth: "1996-07-23", licenseType: "Non-Professional", expirationDate: "2036-08-19", restrictions: "None", conditions: "None", bloodType: "B-", address: "849 Del Pilar St., Brgy. Guadalupe Nuevo, Malabon" },
    ltoSignature: "0x119394b4bdcbd33565889a5c8ecded0ff721ce1cad0d465c8b06771de4f004945e58862080ae54b40236b0ebfc988e0ced4eff8a1c28271044a201d0737709041c",
  },
  {
    subject: { licenseID: "N01-26-540384", firstName: "Claudia", lastName: "Ortiz", dateOfBirth: "1984-09-04", licenseType: "Non-Professional", expirationDate: "2032-08-16", restrictions: "1", conditions: "None", bloodType: "B+", address: "354 Binhagan St, Brgy. Bel-Air, Malabon" },
    ltoSignature: "0x0209047c737b8137fef9725bb755b20096245ba69dd2c33eb4f78661137c732c687a1a2febe1d3b870a72cd50c9e27d1fa2a7738689967c052b74d8cae14eeff1b",
  },
  {
    subject: { licenseID: "N01-26-439637", firstName: "Emilio", lastName: "Villanueva", dateOfBirth: "2000-09-26", licenseType: "Non-Professional", expirationDate: "2035-07-24", restrictions: "1, 2", conditions: "None", bloodType: "AB+", address: "349 Sto Nino St., Brgy. Guadalupe Nuevo, Caloocan" },
    ltoSignature: "0x7d046c11d86f05811f4dda9741e44176802b1685f895345c48b192462b033fff0728f1f2f5b7a5c72bd9108c9dc4f5ad5accb3bd275553df0b94919566e03b391b",
  },
  {
    subject: { licenseID: "N01-26-223046", firstName: "Elena", lastName: "Morales", dateOfBirth: "1981-07-25", licenseType: "Non-Professional", expirationDate: "2033-01-05", restrictions: "None", conditions: "None", bloodType: "O-", address: "820 Silangan St., Brgy. Barrio San Jose, Makati" },
    ltoSignature: "0x3dc947513d12bbb7c3506e544994322dce7409371b0b3c903108f4e4bfc6fda9356f50d48a83b1024738a0aedbfb082abaf9aab2d49658735e912007f3041cb81c",
  },
  {
    subject: { licenseID: "N01-26-927688", firstName: "Fernando", lastName: "Estrada", dateOfBirth: "1998-01-10", licenseType: "Non-Professional", expirationDate: "2029-11-06", restrictions: "1, 2", conditions: "None", bloodType: "AB+", address: "935 Mauban St., Brgy. Tanyang, Quezon City" },
    ltoSignature: "0xed169e2d45b2faa913ca6d6eacd5bed1d262a13d83af53689dcc2df136393d5f32f89daa652f94da1669843f4c6f3a7ca5205564aee35be385e6f09f597e67d11c",
  },
  {
    subject: { licenseID: "N01-26-456629", firstName: "Sergio", lastName: "Campos", dateOfBirth: "1989-08-04", licenseType: "Non-Professional", expirationDate: "2032-04-06", restrictions: "1", conditions: "None", bloodType: "B+", address: "475 bantayan St., Brgy. San Lorenzo, Malabon" },
    ltoSignature: "0x273e0729fee4f9bd24380ce87e2af6fb157c6e4db0a920d94ea11b6d43df6d1b64b3aca4f0fa1bc850c8a671412c737aee902dc12e2610ec3c1bc7a198f05fd61c",
  },
  {
    subject: { licenseID: "N01-26-838362", firstName: "Armando", lastName: "Alvarez", dateOfBirth: "1974-06-10", licenseType: "Non-Professional", expirationDate: "2029-06-16", restrictions: "2", conditions: "None", bloodType: "O-", address: "451 Sto Nino St., Brgy. Pakanen, Parañaque" },
    ltoSignature: "0xe55fe65edc2dc9916b48e2c33457431936b2791ae88824870cfd71637bb8a63a0663756d2f5700b7892eacd01c02490a2b153c251250e271a0b655702a23245d1c",
  },
  {
    subject: { licenseID: "N01-26-458429", firstName: "Federico", lastName: "Garcia", dateOfBirth: "2001-11-02", licenseType: "Non-Professional", expirationDate: "2036-01-15", restrictions: "2", conditions: "None", bloodType: "B+", address: "980 Tagaytay St., Brgy. Kapitolyo, Manila" },
    ltoSignature: "0xd79d4db41ba3dde6bce7827ccf49c7abf3c137a4eed7402eb7baa82508af8ae653106c89b4fb76d76293fd971e53cb9dfd0e9a4a2228bbb772b2991db8e676c01c",
  },
  {
    subject: { licenseID: "N01-26-401034", firstName: "Isabella", lastName: "Reyes", dateOfBirth: "1975-04-02", licenseType: "Non-Professional", expirationDate: "2035-01-26", restrictions: "None", conditions: "None", bloodType: "AB+", address: "568 Lumban St., Brgy. Tanyang, Navotas" },
    ltoSignature: "0xd46178a946d393e1b31f3e5c8cece4d4417af649bb00f46ac8bea622f0b1f90d03416d2d3284bf0fcfd136b7075153b84b76b5113f303570db0a963cad0a47921c",
  },
];

export default mockCitizens;
