import type { StandardInfo } from '../types';

/** Grade 1 content standards (official CA CCSSM text). */
export const GRADE_1_STANDARDS: readonly StandardInfo[] = [
  // Operations and Algebraic Thinking
  {
    code: '1.OA.1',
    grade: '1',
    domain: 'OA',
    cluster: 'Represent and solve problems involving addition and subtraction.',
    text:
      'Use addition and subtraction within 20 to solve word problems involving situations of adding to, taking from, putting together, taking apart, and comparing, with unknowns in all positions, e.g., by using objects, drawings, and equations with a symbol for the unknown number to represent the problem.',
  },
  {
    code: '1.OA.2',
    grade: '1',
    domain: 'OA',
    cluster: 'Represent and solve problems involving addition and subtraction.',
    text:
      'Solve word problems that call for addition of three whole numbers whose sum is less than or equal to 20, e.g., by using objects, drawings, and equations with a symbol for the unknown number to represent the problem.',
  },
  {
    code: '1.OA.3',
    grade: '1',
    domain: 'OA',
    cluster: 'Understand and apply properties of operations and the relationship between addition and subtraction.',
    text:
      'Apply properties of operations as strategies to add and subtract. Examples: If 8 + 3 = 11 is known, then 3 + 8 = 11 is also known. (Commutative property of addition.) To add 2 + 6 + 4, the second two numbers can be added to make a ten, so 2 + 6 + 4 = 2 + 10 = 12. (Associative property of addition.)',
  },
  {
    code: '1.OA.4',
    grade: '1',
    domain: 'OA',
    cluster: 'Understand and apply properties of operations and the relationship between addition and subtraction.',
    text: 'Understand subtraction as an unknown-addend problem. For example, subtract 10 – 8 by finding the number that makes 10 when added to 8.',
  },
  {
    code: '1.OA.5',
    grade: '1',
    domain: 'OA',
    cluster: 'Add and subtract within 20.',
    text: 'Relate counting to addition and subtraction (e.g., by counting on 2 to add 2).',
  },
  {
    code: '1.OA.6',
    grade: '1',
    domain: 'OA',
    cluster: 'Add and subtract within 20.',
    text:
      'Add and subtract within 20, demonstrating fluency for addition and subtraction within 10. Use strategies such as counting on; making ten (e.g., 8 + 6 = 8 + 2 + 4 = 10 + 4 = 14); decomposing a number leading to a ten (e.g., 13 – 4 = 13 – 3 – 1 = 10 – 1 = 9); using the relationship between addition and subtraction (e.g., knowing that 8 + 4 = 12, one knows 12 – 8 = 4); and creating equivalent but easier or known sums (e.g., adding 6 + 7 by creating the known equivalent 6 + 6 + 1 = 12 + 1 = 13).',
  },
  {
    code: '1.OA.7',
    grade: '1',
    domain: 'OA',
    cluster: 'Work with addition and subtraction equations.',
    text:
      'Understand the meaning of the equal sign, and determine if equations involving addition and subtraction are true or false. For example, which of the following equations are true and which are false? 6 = 6, 7 = 8 – 1, 5 + 2 = 2 + 5, 4 + 1 = 5 + 2.',
  },
  {
    code: '1.OA.8',
    grade: '1',
    domain: 'OA',
    cluster: 'Work with addition and subtraction equations.',
    text:
      'Determine the unknown whole number in an addition or subtraction equation relating three whole numbers. For example, determine the unknown number that makes the equation true in each of the equations 8 + ? = 11, 5 = ? – 3, 6 + 6 = ?.',
  },
  // Number and Operations in Base Ten
  {
    code: '1.NBT.1',
    grade: '1',
    domain: 'NBT',
    cluster: 'Extend the counting sequence.',
    text: 'Count to 120, starting at any number less than 120. In this range, read and write numerals and represent a number of objects with a written numeral.',
  },
  {
    code: '1.NBT.2',
    grade: '1',
    domain: 'NBT',
    cluster: 'Understand place value.',
    text:
      'Understand that the two digits of a two-digit number represent amounts of tens and ones. Understand the following as special cases: ' +
      'a. 10 can be thought of as a bundle of ten ones—called a “ten.” ' +
      'b. The numbers from 11 to 19 are composed of a ten and one, two, three, four, five, six, seven, eight, or nine ones. ' +
      'c. The numbers 10, 20, 30, 40, 50, 60, 70, 80, 90 refer to one, two, three, four, five, six, seven, eight, or nine tens (and 0 ones).',
  },
  {
    code: '1.NBT.3',
    grade: '1',
    domain: 'NBT',
    cluster: 'Understand place value.',
    text: 'Compare two two-digit numbers based on meanings of the tens and ones digits, recording the results of comparisons with the symbols >, =, and <.',
  },
  {
    code: '1.NBT.4',
    grade: '1',
    domain: 'NBT',
    cluster: 'Use place value understanding and properties of operations to add and subtract.',
    text:
      'Add within 100, including adding a two-digit number and a one-digit number, and adding a two-digit number and a multiple of 10, using concrete models or drawings and strategies based on place value, properties of operations, and/or the relationship between addition and subtraction; relate the strategy to a written method and explain the reasoning used. Understand that in adding two-digit numbers, one adds tens and tens, ones and ones; and sometimes it is necessary to compose a ten.',
  },
  {
    code: '1.NBT.5',
    grade: '1',
    domain: 'NBT',
    cluster: 'Use place value understanding and properties of operations to add and subtract.',
    text: 'Given a two-digit number, mentally find 10 more or 10 less than the number, without having to count; explain the reasoning used.',
  },
  {
    code: '1.NBT.6',
    grade: '1',
    domain: 'NBT',
    cluster: 'Use place value understanding and properties of operations to add and subtract.',
    text:
      'Subtract multiples of 10 in the range 10–90 from multiples of 10 in the range 10–90 (positive or zero differences), using concrete models or drawings and strategies based on place value, properties of operations, and/or the relationship between addition and subtraction; relate the strategy to a written method and explain the reasoning used.',
  },
  // Measurement and Data
  {
    code: '1.MD.1',
    grade: '1',
    domain: 'MD',
    cluster: 'Measure lengths indirectly and by iterating length units.',
    text: 'Order three objects by length; compare the lengths of two objects indirectly by using a third object.',
  },
  {
    code: '1.MD.2',
    grade: '1',
    domain: 'MD',
    cluster: 'Measure lengths indirectly and by iterating length units.',
    text:
      'Express the length of an object as a whole number of length units, by laying multiple copies of a shorter object (the length unit) end to end; understand that the length measurement of an object is the number of same-size length units that span it with no gaps or overlaps. Limit to contexts where the object being measured is spanned by a whole number of length units with no gaps or overlaps.',
  },
  {
    code: '1.MD.3',
    grade: '1',
    domain: 'MD',
    cluster: 'Tell and write time.',
    text: 'Tell and write time in hours and half-hours using analog and digital clocks.',
  },
  {
    code: '1.MD.4',
    grade: '1',
    domain: 'MD',
    cluster: 'Represent and interpret data.',
    text:
      'Organize, represent, and interpret data with up to three categories; ask and answer questions about the total number of data points, how many in each category, and how many more or less are in one category than in another.',
  },
  // Geometry
  {
    code: '1.G.1',
    grade: '1',
    domain: 'G',
    cluster: 'Reason with shapes and their attributes.',
    text:
      'Distinguish between defining attributes (e.g., triangles are closed and three-sided) versus non-defining attributes (e.g., color, orientation, overall size); build and draw shapes to possess defining attributes.',
  },
  {
    code: '1.G.2',
    grade: '1',
    domain: 'G',
    cluster: 'Reason with shapes and their attributes.',
    text:
      'Compose two-dimensional shapes (rectangles, squares, trapezoids, triangles, half-circles, and quarter-circles) or three-dimensional shapes (cubes, right rectangular prisms, right circular cones, and right circular cylinders) to create a composite shape, and compose new shapes from the composite shape.',
  },
  {
    code: '1.G.3',
    grade: '1',
    domain: 'G',
    cluster: 'Reason with shapes and their attributes.',
    text:
      'Partition circles and rectangles into two and four equal shares, describe the shares using the words halves, fourths, and quarters, and use the phrases half of, fourth of, and quarter of. Describe the whole as two of, or four of the shares. Understand for these examples that decomposing into more equal shares creates smaller shares.',
  },
];
