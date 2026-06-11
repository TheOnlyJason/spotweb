export const ADVENTURES = [
  {
    image: "/adventures/01.jpg",
    date: "August 5, 2021",
    description: "Hunlington Library",
  },
  {
    image: "/adventures/02.jpg",
    date: "September 5, 2021",
    description: "Universal Studios",
  },
  {
    image: "/adventures/03.jpg",
    date: "September 5, 2021",
    description: "UCLA royce hall",
  },
  {
    image: "/adventures/mtsac.jpg",
    date: "October 7, 2021",
    description: "Mt. San Antonio College",
  },
  {
    image: "/adventures/05.jpg",
    date: "June 15, 2022",
    description: "Catalina Island Hotels",
  },
  {
    image: "/adventures/06.jpg",
    date: "September 3, 2022",
    description: "Golden Gate Bridge",
  },
  {
    image: "/adventures/07.jpg",
    date: "December 31, 2024",
    description: "Canton Tower",
  },
  {
    image: "/adventures/08.jpg",
    date: "December 31, 2024",
    description: "Some where next to Canton Tower",
  },
  {
    image: "/adventures/09.jpg",
    date: "December 31, 2024",
    description: "On top of Canton Tower",
  },
  {
    image: "/adventures/10.jpg",
    date: "January 1, 2025",
    description: "Private Beach in China idk",
  },
  {
    image: "/adventures/11.jpg",
    date: "March 8, 2025",
    description: "Long Beach for dragon boat practice",
  },
  {
    image: "/adventures/12.jpg",
    date: "March 26, 2025",
    description: "DEER",
  },
  {
    image: "/adventures/13.jpg",
    date: "April 20, 2025",
    description: "Chino Hill state park",
  },
  {
    image: "/adventures/14.jpg",
    date: "April 20, 2025",
    description: "View",
  },
  {
    image: "/adventures/15.jpg",
    date: "July 20, 2025",
    description: "getting ready to get isekai",
  },
  {
    image: "/adventures/16.jpg",
    date: "October 26, 2025",
    description: "Some Lake",
  },
  {
    image: "/adventures/17.jpg",
    date: "November 29, 2025",
    description: "More Lake",
  },
  {
    image: "/adventures/18.jpg",
    date: "May 10, 2026",
    description: "Rocks",
  },
  {
    image: "/adventures/19.jpg",
    date: "June 10, 2026",
    description: "Dragon Boat Race",
  },
];

export function adventuresToSection(entries = ADVENTURES) {
  if (!entries.length) {
    return {
      title: "Adventures",
      body: "Stories from the road.\n\nAdd entries in src/adventures.js to fill this book.",
    };
  }

  return {
    title: "Adventures",
    photoPages: entries.map((entry) => ({
      photo: entry.image,
      description: entry.description,
      date: entry.date,
    })),
  };
}
