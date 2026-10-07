import type { StandardInfo } from '../types';

const RP1 = 'Analyze proportional relationships and use them to solve real-world and mathematical problems.';
const NS1 = 'Apply and extend previous understandings of operations with fractions to add, subtract, multiply, and divide rational numbers.';
const EE1 = 'Use properties of operations to generate equivalent expressions.';
const EE2 = 'Solve real-life and mathematical problems using numerical and algebraic expressions and equations.';
const G1 = 'Draw, construct, and describe geometrical figures and describe the relationships between them.';
const G2 = 'Solve real-life and mathematical problems involving angle measure, area, surface area, and volume.';
const SP1 = 'Use random sampling to draw inferences about a population.';
const SP2 = 'Draw informal comparative inferences about two populations.';
const SP3 = 'Investigate chance processes and develop, use, and evaluate probability models.';

/** Grade 7 content standards (official CA CCSSM text; long lettered sub-parts lightly abridged). No CA additions in grade 7. */
export const GRADE_7_STANDARDS: readonly StandardInfo[] = [
  {
    code: '7.RP.1',
    grade: '7',
    domain: 'RP',
    cluster: RP1,
    text: 'Compute unit rates associated with ratios of fractions, including ratios of lengths, areas and other quantities measured in like or different units. For example, if a person walks 1/2 mile in each 1/4 hour, compute the unit rate as the complex fraction (1/2)/(1/4) miles per hour, equivalently 2 miles per hour.',
  },
  {
    code: '7.RP.2',
    grade: '7',
    domain: 'RP',
    cluster: RP1,
    text: 'Recognize and represent proportional relationships between quantities. a. Decide whether two quantities are in a proportional relationship, e.g., by testing for equivalent ratios in a table or graphing and observing whether the graph is a straight line through the origin. b. Identify the constant of proportionality (unit rate) in tables, graphs, equations, diagrams, and verbal descriptions. c. Represent proportional relationships by equations, e.g., t = pn. d. Explain what a point (x, y) on the graph of a proportional relationship means, with special attention to (0, 0) and (1, r) where r is the unit rate.',
  },
  {
    code: '7.RP.3',
    grade: '7',
    domain: 'RP',
    cluster: RP1,
    text: 'Use proportional relationships to solve multistep ratio and percent problems. Examples: simple interest, tax, markups and markdowns, gratuities and commissions, fees, percent increase and decrease, percent error.',
  },
  {
    code: '7.NS.1',
    grade: '7',
    domain: 'NS',
    cluster: NS1,
    text: 'Apply and extend previous understandings of addition and subtraction to add and subtract rational numbers; represent addition and subtraction on a horizontal or vertical number line diagram. a. Describe situations in which opposite quantities combine to make 0. b. Understand p + q as the number located a distance |q| from p; a number and its opposite have a sum of 0. c. Understand subtraction as adding the additive inverse, p – q = p + (–q); the distance between two rational numbers is the absolute value of their difference. d. Apply properties of operations as strategies to add and subtract rational numbers.',
  },
  {
    code: '7.NS.2',
    grade: '7',
    domain: 'NS',
    cluster: NS1,
    text: 'Apply and extend previous understandings of multiplication and division and of fractions to multiply and divide rational numbers. a. Understand the rules for multiplying signed numbers, such as (–1)(–1) = 1. b. Integers can be divided, provided the divisor is not zero, and every quotient of integers is a rational number; –(p/q) = (–p)/q = p/(–q). c. Apply properties of operations as strategies to multiply and divide rational numbers. d. Convert a rational number to a decimal using long division; know that the decimal form of a rational number terminates in 0s or eventually repeats.',
  },
  {
    code: '7.NS.3',
    grade: '7',
    domain: 'NS',
    cluster: NS1,
    text: 'Solve real-world and mathematical problems involving the four operations with rational numbers.',
  },
  {
    code: '7.EE.1',
    grade: '7',
    domain: 'EE',
    cluster: EE1,
    text: 'Apply properties of operations as strategies to add, subtract, factor, and expand linear expressions with rational coefficients.',
  },
  {
    code: '7.EE.2',
    grade: '7',
    domain: 'EE',
    cluster: EE1,
    text: 'Understand that rewriting an expression in different forms in a problem context can shed light on the problem and how the quantities in it are related. For example, a + 0.05a = 1.05a means that “increase by 5%” is the same as “multiply by 1.05.”',
  },
  {
    code: '7.EE.3',
    grade: '7',
    domain: 'EE',
    cluster: EE2,
    text: 'Solve multi-step real-life and mathematical problems posed with positive and negative rational numbers in any form (whole numbers, fractions, and decimals), using tools strategically. Apply properties of operations to calculate with numbers in any form; convert between forms as appropriate; and assess the reasonableness of answers using mental computation and estimation strategies.',
  },
  {
    code: '7.EE.4',
    grade: '7',
    domain: 'EE',
    cluster: EE2,
    text: 'Use variables to represent quantities in a real-world or mathematical problem, and construct simple equations and inequalities to solve problems by reasoning about the quantities. a. Solve word problems leading to equations of the form px + q = r and p(x + q) = r, where p, q, and r are specific rational numbers; solve such equations fluently. b. Solve word problems leading to inequalities of the form px + q > r or px + q < r; graph the solution set of the inequality and interpret it in the context of the problem.',
  },
  {
    code: '7.G.1',
    grade: '7',
    domain: 'G',
    cluster: G1,
    text: 'Solve problems involving scale drawings of geometric figures, including computing actual lengths and areas from a scale drawing and reproducing a scale drawing at a different scale.',
  },
  {
    code: '7.G.2',
    grade: '7',
    domain: 'G',
    cluster: G1,
    text: 'Draw (freehand, with ruler and protractor, and with technology) geometric shapes with given conditions. Focus on constructing triangles from three measures of angles or sides, noticing when the conditions determine a unique triangle, more than one triangle, or no triangle.',
  },
  {
    code: '7.G.3',
    grade: '7',
    domain: 'G',
    cluster: G1,
    text: 'Describe the two-dimensional figures that result from slicing three-dimensional figures, as in plane sections of right rectangular prisms and right rectangular pyramids.',
  },
  {
    code: '7.G.4',
    grade: '7',
    domain: 'G',
    cluster: G2,
    text: 'Know the formulas for the area and circumference of a circle and use them to solve problems; give an informal derivation of the relationship between the circumference and area of a circle.',
  },
  {
    code: '7.G.5',
    grade: '7',
    domain: 'G',
    cluster: G2,
    text: 'Use facts about supplementary, complementary, vertical, and adjacent angles in a multi-step problem to write and solve simple equations for an unknown angle in a figure.',
  },
  {
    code: '7.G.6',
    grade: '7',
    domain: 'G',
    cluster: G2,
    text: 'Solve real-world and mathematical problems involving area, volume and surface area of two- and three-dimensional objects composed of triangles, quadrilaterals, polygons, cubes, and right prisms.',
  },
  {
    code: '7.SP.1',
    grade: '7',
    domain: 'SP',
    cluster: SP1,
    text: 'Understand that statistics can be used to gain information about a population by examining a sample of the population; generalizations about a population from a sample are valid only if the sample is representative of that population. Understand that random sampling tends to produce representative samples and support valid inferences.',
  },
  {
    code: '7.SP.2',
    grade: '7',
    domain: 'SP',
    cluster: SP1,
    text: 'Use data from a random sample to draw inferences about a population with an unknown characteristic of interest. Generate multiple samples (or simulated samples) of the same size to gauge the variation in estimates or predictions.',
  },
  {
    code: '7.SP.3',
    grade: '7',
    domain: 'SP',
    cluster: SP2,
    text: 'Informally assess the degree of visual overlap of two numerical data distributions with similar variabilities, measuring the difference between the centers by expressing it as a multiple of a measure of variability.',
  },
  {
    code: '7.SP.4',
    grade: '7',
    domain: 'SP',
    cluster: SP2,
    text: 'Use measures of center and measures of variability for numerical data from random samples to draw informal comparative inferences about two populations.',
  },
  {
    code: '7.SP.5',
    grade: '7',
    domain: 'SP',
    cluster: SP3,
    text: 'Understand that the probability of a chance event is a number between 0 and 1 that expresses the likelihood of the event occurring. Larger numbers indicate greater likelihood. A probability near 0 indicates an unlikely event, a probability around 1/2 indicates an event that is neither unlikely nor likely, and a probability near 1 indicates a likely event.',
  },
  {
    code: '7.SP.6',
    grade: '7',
    domain: 'SP',
    cluster: SP3,
    text: 'Approximate the probability of a chance event by collecting data on the chance process that produces it and observing its long-run relative frequency, and predict the approximate relative frequency given the probability. For example, when rolling a number cube 600 times, predict that a 3 or 6 would be rolled roughly 200 times.',
  },
  {
    code: '7.SP.7',
    grade: '7',
    domain: 'SP',
    cluster: SP3,
    text: 'Develop a probability model and use it to find probabilities of events. Compare probabilities from a model to observed frequencies. a. Develop a uniform probability model by assigning equal probability to all outcomes, and use the model to determine probabilities of events. b. Develop a probability model (which may not be uniform) by observing frequencies in data generated from a chance process.',
  },
  {
    code: '7.SP.8',
    grade: '7',
    domain: 'SP',
    cluster: SP3,
    text: 'Find probabilities of compound events using organized lists, tables, tree diagrams, and simulation. a. The probability of a compound event is the fraction of outcomes in the sample space for which the compound event occurs. b. Represent sample spaces for compound events using organized lists, tables and tree diagrams. c. Design and use a simulation to generate frequencies for compound events.',
  },
];
