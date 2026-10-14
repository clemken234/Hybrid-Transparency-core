// utils/mockData.js

// Keep the original 10 for core seeding purposes
const original10 = [
    { subject: { licenseID: "N01-26-835232", firstName: "Lorena", lastName: "Morales", dateOfBirth: "2004-04-25", licenseType: "Non-Professional", expirationDate: "2033-02-04", restrictions: "None", conditions: "None", bloodType: "O+", address: "260 Busa St., Brgy. Krus na Ligas, Valenzuela" }, ltoSignature: "0x73c886b629156daf30e2debc16962eedc07fc9051e60a18df1172d7bb74f5abe26e044cf0b7a5d10ec363c7d3c59b9b66ab11743cde956eeeb786728ccf00ed01b" },
    { subject: { licenseID: "N01-26-462076", firstName: "Enrique", lastName: "Solis", dateOfBirth: "1996-07-23", licenseType: "Non-Professional", expirationDate: "2036-08-19", restrictions: "None", conditions: "None", bloodType: "B-", address: "849 Del Pilar St., Brgy. Guadalupe Nuevo, Malabon" }, ltoSignature: "0x717c7740bcd3b64e104dc04305854da099c098939a2631eca9081c39caf309083a6c746a26a67b44cc2fa490a61f7e90039bad531b3281038c5e16d94faa05ac1b" },
    { subject: { licenseID: "N01-26-540384", firstName: "Claudia", lastName: "Ortiz", dateOfBirth: "1984-09-04", licenseType: "Non-Professional", expirationDate: "2032-08-16", restrictions: "1", conditions: "None", bloodType: "B+", address: "354 Binhagan St, Brgy. Bel-Air, Malabon" }, ltoSignature: "0x708266224a1c8be1f428fc107385594027587371cf852fdf9e4f9887ed2c8dd06b3eb8b0a1dd0431e277c45bc58bd1899cec7d485017af1fd7ede233c79d84ce1b" },
    { subject: { licenseID: "N01-26-439637", firstName: "Emilio", lastName: "Villanueva", dateOfBirth: "2000-09-26", licenseType: "Non-Professional", expirationDate: "2035-07-24", restrictions: "1, 2", conditions: "None", bloodType: "AB+", address: "349 Sto Nino St., Brgy. Guadalupe Nuevo, Caloocan" }, ltoSignature: "0x1c4020cb3755b90a54a1cb769d9934dab99518dadcbd68b1259ee9c14706c83f1ac6405e65c3f1c4ce47c071ab032961d2c9e2a4f8df3e661e6d872ea310fd4a1b" },
    { subject: { licenseID: "N01-26-223046", firstName: "Elena", lastName: "Morales", dateOfBirth: "1981-07-25", licenseType: "Non-Professional", expirationDate: "2033-01-05", restrictions: "None", conditions: "None", bloodType: "O-", address: "820 Silangan St., Brgy. Barrio San Jose, Makati" }, ltoSignature: "0x3adc71f6b318a77c5452766365a5d02a6aff589a37f3763f42396b594da3ebd918584fa9d96872ced1e30c6600dc62523633bbd275b1481de00d58babb7e6a581b" },
    { subject: { licenseID: "N01-26-927688", firstName: "Fernando", lastName: "Estrada", dateOfBirth: "1998-01-10", licenseType: "Non-Professional", expirationDate: "2029-11-06", restrictions: "1, 2", conditions: "None", bloodType: "AB+", address: "935 Mauban St., Brgy. Tanyang, Quezon City" }, ltoSignature: "0x7fe4816094db85fc01fae0c007dac2501ea8b7f7337892505f8771a02fc339d72734444e80626230b84e47e33115c12d2fc83bbc768931769ebb333b4ead54d81c" },
    { subject: { licenseID: "N01-26-456629", firstName: "Sergio", lastName: "Campos", dateOfBirth: "1989-08-04", licenseType: "Non-Professional", expirationDate: "2032-04-06", restrictions: "1", conditions: "None", bloodType: "B+", address: "475 bantayan St., Brgy. San Lorenzo, Malabon" }, ltoSignature: "0xe72ccf810debcef6b409a570c75009f33f4affe5f144014457058911ba4fdee10ed4976589438be7b2297d7aa1fb18ce505fbd666848a429ee8cca453ea7fee11b" },
    { subject: { licenseID: "N01-26-838362", firstName: "Armando", lastName: "Alvarez", dateOfBirth: "1974-06-10", licenseType: "Non-Professional", expirationDate: "2029-06-16", restrictions: "2", conditions: "None", bloodType: "O-", address: "451 Sto Nino St., Brgy. Pakanen, Parañaque" }, ltoSignature: "0xae6862ed497f22abc06f85cd6647186ac08c1fead757df37e2eeee91e9297dde100e49199c065d6ba354072e44b781c3f1396ff42dffe03d2b8664c1383daf321c" },
    { subject: { licenseID: "N01-26-458429", firstName: "Federico", lastName: "Garcia", dateOfBirth: "2001-11-02", licenseType: "Non-Professional", expirationDate: "2036-01-15", restrictions: "2", conditions: "None", bloodType: "B+", address: "980 Tagaytay St., Brgy. Kapitolyo, Manila" }, ltoSignature: "0x2667ae2125db996fd74e9a8d73b2e26aec8c206ef3e3be96b1cc6ee8507e471c6511f0240eec522977f0d7f1763605b4ec5ed4cd18e1fb233d6bdd8a8aa84fa41b" },
    { subject: { licenseID: "N01-26-401034", firstName: "Isabella", lastName: "Reyes", dateOfBirth: "1975-04-02", licenseType: "Non-Professional", expirationDate: "2035-01-26", restrictions: "None", conditions: "None", bloodType: "AB+", address: "568 Lumban St., Brgy. Tanyang, Navotas" }, ltoSignature: "0xe2c20787a2baa039568fa7b9d99e4fec649e7f8de94926ecd3ae4e62bcfb34c80ff217b2a919cf4775e194306659db230f35f7dbd4dcd23228e5a523ffa8f83e1b" }
];

export const getMockDataArray = () => original10;

const firstNames = ["Juan", "Maria", "Jose", "Ana", "Pedro", "Liza", "Mark", "Sofia", "Carlos", "Elena", "Miguel", "Isabella", "Andres",
    "Camila", "Diego", "Valentina", "Ricardo", "Lucia", "Fernando", "Gabriela", "Jorge", "Natalia", "Alberto", "Samantha",
    "Rafael", "Diana", "Enrique", "Carla", "Manuel", "Paula", "Alfredo", "Vanessa", "Eduardo", "Lorena", "Oscar", "Claudia",
    "Raul", "Veronica", "Sergio", "Marta", "Hector", "Gloria", "Armando", "Yolanda", "Federico", "Adriana", "Gustavo", "Monica",
    "Rosa", "Victor", "Sonia", "Emilio", "Carmen", "Javier", "Teresa", "Salvador", "Faye Ann", "Irabell", "Marie Kei"];

const lastNames = ["Dela Cruz", "Santos", "Reyes", "Garcia", "Bautista", "Ocampo", "Torres", "Flores", "Rivera", "Gomez", "Mendoza", "Vargas",
    "Ramos", "Cruz", "Ortiz", "Navarro", "Silva", "Morales", "Castillo", "Alvarez", "Romero", "Sanchez", "Fernandez", "Gonzalez",
    "Perez", "Diaz", "Martinez", "Lopez", "Hernandez", "Guzman", "Jimenez", "Vazquez", "Sosa", "Mora", "Rojas", "Cabrera", "Salazar",
    "Pena", "Valdez", "Maldonado", "Campos", "Aguilar", "Fuentes", "Cortes", "Estrada", "Villanueva", "Solis", "Macias", "Bravo"];

const mmCities = [
    "Manila", "Quezon City", "Caloocan", "Las Piñas", "Makati",
    "Malabon", "Mandaluyong", "Marikina", "Muntinlupa", "Navotas",
    "Parañaque", "Pasay", "Pasig", "San Juan", "Taguig", "Valenzuela"
];

const mmStreets = [
    "Lumban St.", "Salawag St.", "Buagan St.", "bantayan St.", "Talibon St.", "Silangan St.",
    "Dimasalang St.", "Alapan St.", "Binhagan St", "Pag-asa St.", "Mauban St.", "Busa St.",
    "Kalandang St.", "Sto Nino St.", "Tagaytay St.", "Polagon St.", "Del Pilar St.", "Mabini St."
];

const mmBarangays = [
    "Brgy. Poblacion", "Brgy. Commonwealth", "Brgy. Barrio San Jose", "Brgy. San Lorenzo",
    "Brgy. Bel-Air", "Brgy. Wack-Wack", "Brgy. Tanyang", "Brgy. San Antonio",
    "Brgy. 143", "Brgy. 128", "Brgy. 60", "Brgy. South Triangle", "Brgy. Krus na Ligas",
    "Brgy. Guadalupe Nuevo", "Brgy. Pakanen", "Brgy. Kapitolyo"
];

const bloodTypes = ["O+", "A+", "B+", "AB+", "O-", "A-", "B-"];
const restrictions = ["1", "2", "1, 2", "None"];
const licenseTypes = ["Non-Professional"];

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function getMockApplicant() {
    const firstName = firstNames[getRandomInt(0, firstNames.length - 1)];
    const lastName = lastNames[getRandomInt(0, lastNames.length - 1)];
    const bloodType = bloodTypes[getRandomInt(0, bloodTypes.length - 1)];

    const city = mmCities[getRandomInt(0, mmCities.length - 1)];
    const street = mmStreets[getRandomInt(0, mmStreets.length - 1)];
    const brgy = mmBarangays[getRandomInt(0, mmBarangays.length - 1)];
    const houseNo = getRandomInt(1, 999);

    const fullAddress = `${houseNo} ${street}, ${brgy}, ${city}`;

    const selectedRestriction = restrictions[getRandomInt(0, restrictions.length - 1)];
    const selectedLicenseType = licenseTypes[getRandomInt(0, licenseTypes.length - 1)];

    const licenseID = `N01-26-${getRandomInt(100000, 999999)}`;

    const birthYear = getRandomInt(1970, 2005);
    const birthMonth = String(getRandomInt(1, 12)).padStart(2, '0');
    const birthDay = String(getRandomInt(1, 28)).padStart(2, '0');

    const expYear = getRandomInt(2028, 2036);
    const expMonth = String(getRandomInt(1, 12)).padStart(2, '0');
    const expDay = String(getRandomInt(1, 28)).padStart(2, '0');
    const dynamicExpirationDate = `${expYear}-${expMonth}-${expDay}`;

    return {
        licenseID: licenseID,
        firstName: firstName,
        lastName: lastName,
        dateOfBirth: `${birthYear}-${birthMonth}-${birthDay}`,
        licenseType: selectedLicenseType,
        expirationDate: dynamicExpirationDate,
        restrictions: selectedRestriction,
        conditions: "None",
        bloodType: bloodType,
        address: fullAddress
    };
}