// Bundled defaults for the 16 gaades (proverbs), in display order. Index 0 = gaade 1.
// The live copy lives in Firestore (gaades/1..16) — load it with the Seed button in the admin panel.
export const ANSWERS = [
  "ವೈದ್ಯ ಹೇಳಿದ್ದು ಹಾಲು ಅನ್ನ ರೋಗಿ ಬಯಸಿದ್ದು ಹಾಲು ಅನ್ನ.",
  "ದೇವರು ವರ ಕೊಟ್ಟರೂ ಪೂಜಾರಿ ಕೊಡಬೇಕಲ್ಲ ?!",
  "ಅಡಿಕೆಗೆ ಹೋದ ಮಾನ ಆನೆ ಕೊಟ್ಟರು ಬಾರದು.",
  "ಉಪ್ಪಿಗಿಂತ ರುಚಿಯಿಲ್ಲ ತಾಯಿಗಿಂತ ಬಂಧುವಿಲ್ಲ.",
  "ಕೈ ಕೆಸರಾದರೆ ಬಾಯಿ ಮೊಸರು.",
  "ಮನೆ ಕಟ್ಟಿ ನೋಡು ಮದುವೆ ಮಾಡಿ ನೋಡು.",
  "ನೂಲಿನಂತೆ ಸೀರೆ ತಾಯಿಯಂತೆ ಮಗಳು.",
  "ಹಾಸಿಗೆ ಇದ್ದಷ್ಟು ಕಾಲು ಚಾಚು.",
  "ಚಿಂತೆ ಇಲ್ಲದವನಿಗೆ ಸಂತೆಯಲ್ಲೂ ನಿದ್ದೆ !",
  "ಹೊಸದರಲ್ಲಿ ಅಗಸ ಬಟ್ಟೆಯನ್ನು ಎತ್ತಿ ಎತ್ತಿ ಒಗೆದ.",
  "ಮಾತು ಬೆಳ್ಳಿ ಮೌನ ಬಂಗಾರ.",
  "ಬೆಂಕಿ ಬಿದ್ದಾಗ ಬಾವಿ ತೋಡುವುದು.",
  "ಇಬ್ಬರ ಜಗಳ ಮೂರನೆಯವನಿಗೆ ಲಾಭ !",
  "ಕುಂಬಾರನಿಗೆ ವರುಷ ದೊಣ್ಣೆಗೆ ನಿಮಿಷ.",
  "ಗಿಡವಾಗಿ ಬಗ್ಗದ್ದು ಮರವಾಗಿ ಬಗ್ಗೀತೇ ?",
  "ಆಕಳು ಕಪ್ಪಾದರೆ ಹಾಲು ಕಪ್ಪೆ ?",
];

export const IAST = [
  "Vaidya hēḷiddu hālu anna rōgi bayasiddu hālu anna.",
  "Dēvaru vara koṭṭarū pūjāri koḍabēkalla ?!",
  "Aḍikege hōda māna āne koṭṭaru bāradu.",
  "Uppigiṃta ruciyilla tāyigiṃta baṃdhuvilla.",
  "Kai kesarādare bāyi mosaru.",
  "Mane kaṭṭi nōḍu maduve māḍi nōḍu.",
  "Nūlinaṃte sīre tāyiyaṃte magaḷu.",
  "Hāsige iddaṣṭu kālu cācu.",
  "Ciṃte illadavanige saṃteyallū nidde !",
  "Hosadaralli agasa baṭṭeyannu etti etti ogeda.",
  "Mātu beḷḷi mauna baṃgāra.",
  "Beṃki biddāga bāvi tōḍuvudu.",
  "Ibbara jagaḷa mūraneyavanige lābha !",
  "Kuṃbāranige varuṣa doṇṇege nimiṣa.",
  "Giḍavāgi baggaddu maravāgi baggītē ?",
  "Ākaḷu kappādare hālu kappe ?",
];

export const N = ANSWERS.length;

export const DEFAULT_GAADES = ANSWERS.map((answer, k) => ({ answer, iast: IAST[k] }));
