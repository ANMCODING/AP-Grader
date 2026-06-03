export interface SyntheticTopic {
  id: number;
  slug: string;
  description: string;
}

export const SYNTHETIC_TOPICS: SyntheticTopic[] = [
  { id: 1, slug: "topic-01", description: "social media passive scrolling and depressive symptoms in adolescent girls aged 14 to 17" },
  { id: 2, slug: "topic-02", description: "caffeine dosage and reaction time in high school varsity athletes" },
  { id: 3, slug: "topic-03", description: "mindfulness meditation frequency and test anxiety scores in first-year college students" },
  { id: 4, slug: "topic-04", description: "parental homework involvement style and academic self-efficacy in sixth and seventh grade students" },
  { id: 5, slug: "topic-05", description: "video game play duration and sleep onset latency in male teenagers aged 13 to 18" },
  { id: 6, slug: "topic-06", description: "screen time before bed and attention span during morning classes in elementary school students" },
  { id: 7, slug: "topic-07", description: "exercise frequency and Beck Depression Inventory scores in high school athletes" },
  { id: 8, slug: "topic-08", description: "background music tempo and reading comprehension scores in college students during study sessions" },
  { id: 9, slug: "topic-09", description: "sleep duration and cumulative GPA in first-semester college students" },
  { id: 10, slug: "topic-10", description: "peer presence and risk-taking behavior in adolescents versus adults in laboratory decision tasks" },
  { id: 11, slug: "topic-11", description: "teacher feedback specificity and intrinsic motivation scores in ninth grade English classes" },
  { id: 12, slug: "topic-12", description: "single-gender versus coeducational classroom format and algebra test scores in seventh grade" },
  { id: 13, slug: "topic-13", description: "daily homework quantity in minutes and standardized test performance in middle school students" },
  { id: 14, slug: "topic-14", description: "school start time and self-reported sleep quality in high school students in suburban districts" },
  { id: 15, slug: "topic-15", description: "Instagram use frequency and body dissatisfaction scores in teenage girls at one high school" },
  { id: 16, slug: "topic-16", description: "soil pH level and Lactuca sativa germination rate and biomass in a controlled greenhouse setting" },
  { id: 17, slug: "topic-17", description: "blue light wavelength exposure and Daphnia magna heart rate in laboratory conditions" },
  { id: 18, slug: "topic-18", description: "organic versus synthetic fertilizer type and Phaseolus vulgaris biomass at four weeks" },
  { id: 19, slug: "topic-19", description: "ambient noise level in decibels and reading comprehension accuracy in college students" },
  { id: 20, slug: "topic-20", description: "room temperature and short-term memory recall performance in college students" },
  { id: 21, slug: "topic-21", description: "first-generation college student status and academic identity negotiation at a predominantly white institution" },
  { id: 22, slug: "topic-22", description: "representation of climate change scientific consensus in popular YouTube science videos" },
  { id: 23, slug: "topic-23", description: "teacher-student relationship quality and school belonging scores in sixth grade students" },
  { id: 24, slug: "topic-24", description: "financial aid navigation barriers experienced by first-generation college students during their first semester" },
  { id: 25, slug: "topic-25", description: "participation in extracurricular activities and social belonging scores in high school freshmen" },
];

export function topicForPaperIndex(paperNum: number): SyntheticTopic {
  return SYNTHETIC_TOPICS[(paperNum - 1) % 25];
}

export function isGraphSynthesisTopic(topicId: number): boolean {
  return [4, 6, 16, 18].includes(topicId);
}
