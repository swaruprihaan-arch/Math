import type { StandardInfo } from '../types';

const RP1 = 'Understand ratio concepts and use ratio reasoning to solve problems.';
const NS1 = 'Apply and extend previous understandings of multiplication and division to divide fractions by fractions.';
const NS2 = 'Compute fluently with multi-digit numbers and find common factors and multiples.';
const NS3 = 'Apply and extend previous understandings of numbers to the system of rational numbers.';
const EE1 = 'Apply and extend previous understandings of arithmetic to algebraic expressions.';
const EE2 = 'Reason about and solve one-variable equations and inequalities.';
const EE3 = 'Represent and analyze quantitative relationships between dependent and independent variables.';
const G1 = 'Solve real-world and mathematical problems involving area, surface area, and volume.';
const SP1 = 'Develop understanding of statistical variability.';
const SP2 = 'Summarize and describe distributions.';

/** Grade 6 content standards (official CA CCSSM text; long lettered sub-parts lightly abridged). No CA additions in grade 6. */
export const GRADE_6_STANDARDS: readonly StandardInfo[] = [
  {
    code: '6.RP.1',
    grade: '6',
    domain: 'RP',
    cluster: RP1,
    text: 'Understand the concept of a ratio and use ratio language to describe a ratio relationship between two quantities. For example, “The ratio of wings to beaks in the bird house at the zoo was 2:1, because for every 2 wings there was 1 beak.”',
  },
  {
    code: '6.RP.2',
    grade: '6',
    domain: 'RP',
    cluster: RP1,
    text: 'Understand the concept of a unit rate a/b associated with a ratio a:b with b ≠ 0, and use rate language in the context of a ratio relationship. For example, “We paid $75 for 15 hamburgers, which is a rate of $5 per hamburger.”',
  },
  {
    code: '6.RP.3',
    grade: '6',
    domain: 'RP',
    cluster: RP1,
    text: 'Use ratio and rate reasoning to solve real-world and mathematical problems, e.g., by reasoning about tables of equivalent ratios, tape diagrams, double number line diagrams, or equations. a. Make tables of equivalent ratios, find missing values, and plot the pairs on the coordinate plane; use tables to compare ratios. b. Solve unit rate problems including those involving unit pricing and constant speed. c. Find a percent of a quantity as a rate per 100; solve problems involving finding the whole, given a part and the percent. d. Use ratio reasoning to convert measurement units.',
  },
  {
    code: '6.NS.1',
    grade: '6',
    domain: 'NS',
    cluster: NS1,
    text: 'Interpret and compute quotients of fractions, and solve word problems involving division of fractions by fractions, e.g., by using visual fraction models and equations to represent the problem. For example, (2/3) ÷ (3/4) = 8/9 because 3/4 of 8/9 is 2/3. (In general, (a/b) ÷ (c/d) = ad/bc.)',
  },
  { code: '6.NS.2', grade: '6', domain: 'NS', cluster: NS2, text: 'Fluently divide multi-digit numbers using the standard algorithm.' },
  {
    code: '6.NS.3',
    grade: '6',
    domain: 'NS',
    cluster: NS2,
    text: 'Fluently add, subtract, multiply, and divide multi-digit decimals using the standard algorithm for each operation.',
  },
  {
    code: '6.NS.4',
    grade: '6',
    domain: 'NS',
    cluster: NS2,
    text: 'Find the greatest common factor of two whole numbers less than or equal to 100 and the least common multiple of two whole numbers less than or equal to 12. Use the distributive property to express a sum of two whole numbers 1–100 with a common factor as a multiple of a sum of two whole numbers with no common factor. For example, express 36 + 8 as 4 (9 + 2).',
  },
  {
    code: '6.NS.5',
    grade: '6',
    domain: 'NS',
    cluster: NS3,
    text: 'Understand that positive and negative numbers are used together to describe quantities having opposite directions or values (e.g., temperature above/below zero, elevation above/below sea level, credits/debits); use positive and negative numbers to represent quantities in real-world contexts, explaining the meaning of 0 in each situation.',
  },
  {
    code: '6.NS.6',
    grade: '6',
    domain: 'NS',
    cluster: NS3,
    text: 'Understand a rational number as a point on the number line. Extend number line diagrams and coordinate axes to represent points with negative number coordinates. a. Recognize opposite signs of numbers as locations on opposite sides of 0; the opposite of the opposite of a number is the number itself, e.g., –(–3) = 3. b. Understand signs of numbers in ordered pairs as indicating quadrants; points that differ only by signs are reflections across one or both axes. c. Find and position integers and other rational numbers on a number line and pairs on a coordinate plane.',
  },
  {
    code: '6.NS.7',
    grade: '6',
    domain: 'NS',
    cluster: NS3,
    text: 'Understand ordering and absolute value of rational numbers. a. Interpret statements of inequality as statements about relative position on a number line. b. Write, interpret, and explain statements of order for rational numbers in real-world contexts. c. Understand the absolute value of a rational number as its distance from 0 on the number line. d. Distinguish comparisons of absolute value from statements about order.',
  },
  {
    code: '6.NS.8',
    grade: '6',
    domain: 'NS',
    cluster: NS3,
    text: 'Solve real-world and mathematical problems by graphing points in all four quadrants of the coordinate plane. Include use of coordinates and absolute value to find distances between points with the same first coordinate or the same second coordinate.',
  },
  { code: '6.EE.1', grade: '6', domain: 'EE', cluster: EE1, text: 'Write and evaluate numerical expressions involving whole-number exponents.' },
  {
    code: '6.EE.2',
    grade: '6',
    domain: 'EE',
    cluster: EE1,
    text: 'Write, read, and evaluate expressions in which letters stand for numbers. a. Write expressions that record operations with numbers and with letters standing for numbers. b. Identify parts of an expression using mathematical terms (sum, term, product, factor, quotient, coefficient). c. Evaluate expressions at specific values of their variables, including formulas such as V = s³ and A = 6s², performing operations in the conventional order (Order of Operations).',
  },
  {
    code: '6.EE.3',
    grade: '6',
    domain: 'EE',
    cluster: EE1,
    text: 'Apply the properties of operations to generate equivalent expressions. For example, apply the distributive property to 3 (2 + x) to produce 6 + 3x; to 24x + 18y to produce 6 (4x + 3y); and apply properties of operations to y + y + y to produce 3y.',
  },
  {
    code: '6.EE.4',
    grade: '6',
    domain: 'EE',
    cluster: EE1,
    text: 'Identify when two expressions are equivalent (i.e., when the two expressions name the same number regardless of which value is substituted into them). For example, y + y + y and 3y are equivalent.',
  },
  {
    code: '6.EE.5',
    grade: '6',
    domain: 'EE',
    cluster: EE2,
    text: 'Understand solving an equation or inequality as a process of answering a question: which values from a specified set, if any, make the equation or inequality true? Use substitution to determine whether a given number in a specified set makes an equation or inequality true.',
  },
  {
    code: '6.EE.6',
    grade: '6',
    domain: 'EE',
    cluster: EE2,
    text: 'Use variables to represent numbers and write expressions when solving a real-world or mathematical problem; understand that a variable can represent an unknown number, or any number in a specified set.',
  },
  {
    code: '6.EE.7',
    grade: '6',
    domain: 'EE',
    cluster: EE2,
    text: 'Solve real-world and mathematical problems by writing and solving equations of the form x + p = q and px = q for cases in which p, q and x are all nonnegative rational numbers.',
  },
  {
    code: '6.EE.8',
    grade: '6',
    domain: 'EE',
    cluster: EE2,
    text: 'Write an inequality of the form x > c or x < c to represent a constraint or condition in a real-world or mathematical problem. Recognize that inequalities of the form x > c or x < c have infinitely many solutions; represent solutions of such inequalities on number line diagrams.',
  },
  {
    code: '6.EE.9',
    grade: '6',
    domain: 'EE',
    cluster: EE3,
    text: 'Use variables to represent two quantities in a real-world problem that change in relationship to one another; write an equation to express the dependent variable in terms of the independent variable. Analyze the relationship using graphs and tables, and relate these to the equation. For example, write d = 65t to represent distance and time at constant speed.',
  },
  {
    code: '6.G.1',
    grade: '6',
    domain: 'G',
    cluster: G1,
    text: 'Find the area of right triangles, other triangles, special quadrilaterals, and polygons by composing into rectangles or decomposing into triangles and other shapes; apply these techniques in the context of solving real-world and mathematical problems.',
  },
  {
    code: '6.G.2',
    grade: '6',
    domain: 'G',
    cluster: G1,
    text: 'Find the volume of a right rectangular prism with fractional edge lengths by packing it with unit cubes of the appropriate unit fraction edge lengths, and show that the volume is the same as would be found by multiplying the edge lengths. Apply the formulas V = l w h and V = b h to find volumes of right rectangular prisms with fractional edge lengths.',
  },
  {
    code: '6.G.3',
    grade: '6',
    domain: 'G',
    cluster: G1,
    text: 'Draw polygons in the coordinate plane given coordinates for the vertices; use coordinates to find the length of a side joining points with the same first coordinate or the same second coordinate. Apply these techniques in the context of solving real-world and mathematical problems.',
  },
  {
    code: '6.G.4',
    grade: '6',
    domain: 'G',
    cluster: G1,
    text: 'Represent three-dimensional figures using nets made up of rectangles and triangles, and use the nets to find the surface area of these figures. Apply these techniques in the context of solving real-world and mathematical problems.',
  },
  {
    code: '6.SP.1',
    grade: '6',
    domain: 'SP',
    cluster: SP1,
    text: 'Recognize a statistical question as one that anticipates variability in the data related to the question and accounts for it in the answers. For example, “How old am I?” is not a statistical question, but “How old are the students in my school?” is a statistical question.',
  },
  {
    code: '6.SP.2',
    grade: '6',
    domain: 'SP',
    cluster: SP1,
    text: 'Understand that a set of data collected to answer a statistical question has a distribution which can be described by its center, spread, and overall shape.',
  },
  {
    code: '6.SP.3',
    grade: '6',
    domain: 'SP',
    cluster: SP1,
    text: 'Recognize that a measure of center for a numerical data set summarizes all of its values with a single number, while a measure of variation describes how its values vary with a single number.',
  },
  { code: '6.SP.4', grade: '6', domain: 'SP', cluster: SP2, text: 'Display numerical data in plots on a number line, including dot plots, histograms, and box plots.' },
  {
    code: '6.SP.5',
    grade: '6',
    domain: 'SP',
    cluster: SP2,
    text: 'Summarize numerical data sets in relation to their context, such as by: a. Reporting the number of observations. b. Describing the nature of the attribute under investigation. c. Giving quantitative measures of center (median and/or mean) and variability (interquartile range and/or mean absolute deviation), and describing patterns and striking deviations. d. Relating the choice of measures of center and variability to the shape of the data distribution and the context.',
  },
];
