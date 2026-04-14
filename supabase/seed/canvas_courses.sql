-- Canvas Courses Seed Data (30+ courses)
-- Run after 002_full_schema.sql

insert into public.canvas_courses (course_code, course_name, major, class_year, credits, prerequisites, professor_name, professor_email, professor_office, professor_office_hours, description) values

-- Computer Science
('COMS 101', 'Fundamentals of Computing', 'Computer Science', 'Freshman', 3, '{}', 'Dr. Mindy Dobbs', 'mdobbs@iastate.edu', '102 Atanasoff Hall', 'Tue/Thu 10:00–11:30 AM', 'Introduction to computing concepts, algorithms, and basic programming. No prior experience required.'),
('COMS 207', 'Introduction to Programming', 'Computer Science', 'Freshman', 3, '{}', 'Dr. Carl Chang', 'cchang@iastate.edu', '215 Atanasoff Hall', 'Mon/Wed 1:00–2:30 PM', 'Covers Python programming fundamentals: variables, loops, functions, and problem-solving strategies.'),
('COMS 228', 'Introduction to Data Structures', 'Computer Science', 'Sophomore', 3, ARRAY['COMS 207'], 'Dr. Simanta Mitra', 'smitra@iastate.edu', '233 Atanasoff Hall', 'Mon/Wed/Fri 11:00 AM–12:00 PM', 'Covers Java-based data structures including lists, stacks, queues, trees, and hash tables.'),
('COMS 311', 'Algorithm Analysis', 'Computer Science', 'Junior', 3, ARRAY['COMS 228', 'MATH 301'], 'Dr. Andrew Miner', 'aeminer@iastate.edu', '223 Atanasoff Hall', 'Mon/Wed 2:00–3:30 PM', 'Analysis of algorithms for correctness and efficiency. Topics include sorting, searching, graph algorithms, and NP-completeness.'),
('COMS 319', 'Construction of User Interfaces', 'Computer Science', 'Junior', 3, ARRAY['COMS 228'], 'Dr. Abraham Aldaco', 'aldaco@iastate.edu', '241 Atanasoff Hall', 'Tue/Thu 2:00–3:30 PM', 'Principles and practice of building graphical user interfaces using modern frameworks including React.'),
('COMS 352', 'Introduction to Operating Systems', 'Computer Science', 'Junior', 3, ARRAY['COMS 311'], 'Dr. Goce Trajcevski', 'gtrajce@iastate.edu', '209 Atanasoff Hall', 'Mon/Wed/Fri 9:00–10:00 AM', 'Covers processes, threads, memory management, file systems, and concurrency in modern operating systems.'),
('COMS 362', 'Object Oriented Analysis and Design', 'Computer Science', 'Junior', 3, ARRAY['COMS 228'], 'Dr. Ali Jannesari', 'jannesar@iastate.edu', '228 Atanasoff Hall', 'Tue/Thu 11:00 AM–12:30 PM', 'UML modeling, design patterns, software architecture, and agile development methodologies.'),
('COMS 472', 'Artificial Intelligence', 'Computer Science', 'Senior', 3, ARRAY['COMS 311'], 'Dr. Jin Tian', 'jtian@iastate.edu', '217 Atanasoff Hall', 'Mon/Wed 3:30–5:00 PM', 'Search algorithms, knowledge representation, machine learning basics, and neural networks.'),

-- Computer Engineering
('CPR E 185', 'Introduction to C and C++ for Engineers', 'Computer Engineering', 'Freshman', 2, '{}', 'Dr. Phillip Jones', 'pjones@iastate.edu', '3128 Coover Hall', 'Mon/Wed 10:00–11:00 AM', 'Covers C and C++ programming with applications in embedded systems and hardware interfaces.'),
('CPR E 281', 'Digital Logic', 'Computer Engineering', 'Sophomore', 4, ARRAY['MATH 165'], 'Dr. Joseph Zambreno', 'zambreno@iastate.edu', '3115 Coover Hall', 'Mon/Wed/Fri 8:00–9:00 AM', 'Boolean algebra, combinational and sequential circuits, finite state machines, and basic digital design.'),
('CPR E 381', 'Computer Organization and Assembly Language', 'Computer Engineering', 'Junior', 3, ARRAY['CPR E 281', 'COMS 228'], 'Dr. Zhao Zhang', 'zzhang@iastate.edu', '3212 Coover Hall', 'Tue/Thu 9:30–11:00 AM', 'MIPS instruction set, CPU datapath and control, pipelining, memory hierarchy, and I/O.'),
('CPR E 488', 'Embedded Systems Design', 'Computer Engineering', 'Senior', 3, ARRAY['CPR E 381'], 'Dr. Daji Qiao', 'daji@iastate.edu', '3218 Coover Hall', 'Mon/Wed 1:00–2:30 PM', 'Design of embedded systems with real-time constraints. Includes FPGAs, RTOS, and hardware/software co-design.'),

-- Electrical Engineering
('E E 201', 'Electric Circuits', 'Electrical Engineering', 'Sophomore', 4, ARRAY['MATH 166', 'PHYS 231'], 'Dr. Mani Mina', 'mmina@iastate.edu', '2113 Coover Hall', 'Mon/Wed/Fri 10:00–11:00 AM', 'Circuit analysis techniques including Kirchhoff laws, Thevenin/Norton equivalents, and AC circuits.'),
('E E 230', 'Electronic Circuits', 'Electrical Engineering', 'Sophomore', 4, ARRAY['E E 201'], 'Dr. Nathan Neihart', 'neihart@iastate.edu', '2114 Coover Hall', 'Tue/Thu 8:00–9:30 AM', 'Semiconductor devices, diodes, BJTs, FETs, and analog circuit design including amplifiers.'),
('E E 324', 'Signals and Systems', 'Electrical Engineering', 'Junior', 3, ARRAY['E E 201', 'MATH 267'], 'Dr. Aleksandar Dogandžić', 'ald@iastate.edu', '2120 Coover Hall', 'Mon/Wed/Fri 1:00–2:00 PM', 'Continuous and discrete-time signals, Fourier analysis, Laplace transforms, and system analysis.'),

-- Mathematics
('MATH 165', 'Calculus I', 'General', 'Freshman', 4, '{}', 'Dr. Jonathan Smith', 'jsmith@iastate.edu', '428 Carver Hall', 'Mon/Wed 2:00–3:30 PM', 'Limits, derivatives, and integrals of functions of one variable with engineering applications.'),
('MATH 166', 'Calculus II', 'General', 'Freshman', 4, ARRAY['MATH 165'], 'Dr. Paula Blakey', 'pblakey@iastate.edu', '432 Carver Hall', 'Tue/Thu 10:00–11:30 AM', 'Techniques of integration, sequences, series, and Taylor polynomials.'),
('MATH 265', 'Calculus III', 'General', 'Sophomore', 4, ARRAY['MATH 166'], 'Dr. Steven Butler', 'butler@iastate.edu', '441 Carver Hall', 'Mon/Wed/Fri 9:00–10:00 AM', 'Multivariable calculus: partial derivatives, multiple integrals, and vector calculus.'),
('MATH 267', 'Elementary Differential Equations', 'General', 'Sophomore', 3, ARRAY['MATH 166'], 'Dr. Eric Weber', 'esweber@iastate.edu', '456 Carver Hall', 'Mon/Wed/Fri 11:00 AM–12:00 PM', 'First and second order ODEs, systems of equations, Laplace transforms, and applications.'),
('MATH 301', 'Abstract Algebra', 'Mathematics', 'Junior', 3, ARRAY['MATH 265'], 'Dr. Justin Peters', 'jpeters@iastate.edu', '470 Carver Hall', 'Tue/Thu 1:00–2:30 PM', 'Groups, rings, fields, homomorphisms, and quotient structures.'),

-- Physics
('PHYS 231', 'Introduction to Classical Physics I', 'General', 'Freshman', 5, ARRAY['MATH 165'], 'Dr. Marshall Luban', 'mluban@iastate.edu', '12 Physics Hall', 'Mon/Wed/Fri 8:00–9:00 AM', 'Mechanics, kinematics, dynamics, energy, momentum, and rotational motion.'),
('PHYS 232', 'Introduction to Classical Physics II', 'General', 'Freshman', 5, ARRAY['PHYS 231', 'MATH 166'], 'Dr. Kerry Whisnant', 'whisnant@iastate.edu', '15 Physics Hall', 'Mon/Wed/Fri 10:00–11:00 AM', 'Electricity, magnetism, waves, and optics.'),

-- Biology
('BIOL 211', 'Principles of Biology', 'Biology', 'Freshman', 4, '{}', 'Dr. Eve Wurtele', 'mewurtele@iastate.edu', '203 Bessey Hall', 'Tue/Thu 9:30–11:00 AM', 'Cell biology, genetics, evolution, ecology, and diversity of life.'),
('BIOL 313', 'Genetics', 'Biology', 'Sophomore', 3, ARRAY['BIOL 211'], 'Dr. Drena Dobbs', 'ddobbs@iastate.edu', '218 Bessey Hall', 'Mon/Wed/Fri 1:00–2:00 PM', 'Mendelian genetics, molecular genetics, gene expression, and genomics.'),
('BIOL 427', 'Biochemistry I', 'Biology', 'Junior', 3, ARRAY['BIOL 313', 'CHEM 231'], 'Dr. Basil Nikolau', 'dimmas@iastate.edu', '232 Bessey Hall', 'Mon/Wed 3:00–4:30 PM', 'Protein structure and function, enzymology, metabolism, and bioenergetics.'),

-- Chemistry
('CHEM 177', 'General Chemistry I', 'General', 'Freshman', 4, '{}', 'Dr. Patricia Thiel', 'pthiel@iastate.edu', '218 Spedding Hall', 'Mon/Wed/Fri 9:00–10:00 AM', 'Atomic structure, bonding, stoichiometry, gases, liquids, solids, and thermochemistry.'),
('CHEM 231', 'Organic Chemistry I', 'Chemistry', 'Sophomore', 3, ARRAY['CHEM 177'], 'Dr. George Kraus', 'gkraus@iastate.edu', '225 Spedding Hall', 'Tue/Thu 11:00 AM–12:30 PM', 'Structure, bonding, and reactions of organic compounds including alkanes, alkenes, and alkynes.'),

-- Business
('BUS A 215', 'Principles of Accounting', 'Business Administration', 'Freshman', 3, '{}', 'Dr. Charles Schwab', 'cschwab@iastate.edu', '3215 Gerdin Hall', 'Mon/Wed/Fri 10:00–11:00 AM', 'Introduction to financial and managerial accounting concepts, financial statements, and business decisions.'),
('BUS 250', 'Introduction to Business Analytics', 'Business Administration', 'Sophomore', 3, ARRAY['MATH 165'], 'Dr. Susan Warren', 'swarren@iastate.edu', '3218 Gerdin Hall', 'Tue/Thu 1:00–2:30 PM', 'Data-driven decision making, statistical analysis, and visualization tools for business applications.'),
('MKT 340', 'Principles of Marketing', 'Business Administration', 'Sophomore', 3, '{}', 'Dr. Roger Calantone', 'calanto@iastate.edu', '3230 Gerdin Hall', 'Mon/Wed 1:00–2:30 PM', 'Marketing strategy, consumer behavior, market research, and the 4Ps of marketing.'),
('MGT 301', 'Management and Organization', 'Business Administration', 'Junior', 3, '{}', 'Dr. Deborah Godwin', 'dgodwin@iastate.edu', '3245 Gerdin Hall', 'Tue/Thu 9:30–11:00 AM', 'Organizational theory, leadership styles, motivation, team dynamics, and strategic management.'),
('FIN 301', 'Principles of Finance', 'Business Administration', 'Junior', 3, ARRAY['BUS A 215'], 'Dr. Thomas Melvin', 'tmelvin@iastate.edu', '3252 Gerdin Hall', 'Mon/Wed/Fri 2:00–3:00 PM', 'Time value of money, risk and return, capital budgeting, and corporate financial management.'),

-- Mechanical Engineering
('M E 270', 'Engineering Statics', 'Mechanical Engineering', 'Sophomore', 3, ARRAY['PHYS 231', 'MATH 265'], 'Dr. Frank Peters', 'fpeters@iastate.edu', '2025 Black Engineering', 'Mon/Wed 10:00–11:30 AM', 'Equilibrium of rigid bodies, trusses, frames, machines, friction, and distributed forces.'),
('M E 325', 'Engineering Thermodynamics', 'Mechanical Engineering', 'Junior', 3, ARRAY['M E 270', 'MATH 267'], 'Dr. Theodore Heindel', 'theindel@iastate.edu', '2040 Black Engineering', 'Mon/Wed/Fri 1:00–2:00 PM', 'Laws of thermodynamics, properties of substances, power and refrigeration cycles, and gas mixtures.'),
('M E 415', 'Design of Machine Elements', 'Mechanical Engineering', 'Senior', 3, ARRAY['M E 270'], 'Dr. Eliot Winer', 'ewiner@iastate.edu', '2055 Black Engineering', 'Tue/Thu 2:00–3:30 PM', 'Mechanical design of shafts, gears, bearings, fasteners, and springs using failure theory.')

on conflict (course_code) do nothing;
