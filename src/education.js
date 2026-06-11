export const EDUCATION_PHOTO_PAGES = [
  {
    photo: "/adventures/ucla.jpg",
    description:
      "B.S. Computer Science & Mathematics:\nUniversity of California, Los Angeles (UCLA) — 2023 to 2025, Los Angeles, CA.\nActivities: ACM, UPE, dragon boat, handson data union",
    textAlign: "left",
  },
  {
    photo: "/adventures/mtsac.jpg",
    description:
      "Associate's coursework / transfer foundation:\nMt. San Antonio College (Mt. SAC) — 2021 to 2023, Walnut, CA.\nMathematics and Computer Science Award (Jun 2023) for demonstrated excellence.",
    textAlign: "left",
  },
];

export function educationToSection(section) {
  return {
    ...section,
    title: "",
    body: "",
    photoPages: EDUCATION_PHOTO_PAGES,
  };
}
