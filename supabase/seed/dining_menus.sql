-- Dining Menus Seed Data
-- Run after 002_full_schema.sql
-- Seeds a week of menu data for ISU's main dining halls

-- Helper: current week dates (using relative inserts)
-- Conversations (MRC), Friley Windows, UDCC

-- CONVERSATIONS (MRC) -- Monday through Sunday
insert into public.dining_menus (dining_hall, meal_period, menu_date, items, hours) values

-- Conversations Breakfast
('Conversations', 'breakfast', current_date, ARRAY['Scrambled Eggs', 'Bacon Strips', 'Blueberry Pancakes', 'Oatmeal Bar', 'Fresh Fruit Bowl', 'Bagels & Cream Cheese', 'Orange Juice', 'Coffee Station'], '7:00 AM – 10:30 AM'),
('Conversations', 'breakfast', current_date + 1, ARRAY['French Toast', 'Turkey Sausage', 'Hard Boiled Eggs', 'Yogurt Parfait', 'Waffles', 'Assorted Cereals', 'Apple Juice', 'Coffee Station'], '7:00 AM – 10:30 AM'),
('Conversations', 'breakfast', current_date + 2, ARRAY['Breakfast Burritos', 'Hash Browns', 'Greek Yogurt', 'Banana Nut Muffins', 'Scrambled Eggs', 'Soy Milk', 'Smoothie Station'], '7:00 AM – 10:30 AM'),

-- Conversations Lunch
('Conversations', 'lunch', current_date, ARRAY['Grilled Chicken Sandwich', 'Vegetarian Chili', 'Tossed Salad Bar', 'Mac & Cheese', 'Roasted Vegetables', 'Dinner Rolls', 'Chocolate Chip Cookies', 'Iced Tea'], '10:30 AM – 2:30 PM'),
('Conversations', 'lunch', current_date + 1, ARRAY['Beef Tacos', 'Black Bean Tacos (V)', 'Spanish Rice', 'Refried Beans', 'Pico de Gallo', 'Guacamole', 'Tortilla Chips', 'Lemonade'], '10:30 AM – 2:30 PM'),
('Conversations', 'lunch', current_date + 2, ARRAY['Pasta Bar (Penne, Rotini, Fettuccine)', 'Marinara Sauce', 'Alfredo Sauce', 'Grilled Chicken Topping', 'Caesar Salad', 'Garlic Bread', 'Tiramisu', 'Sparkling Water'], '10:30 AM – 2:30 PM'),

-- Conversations Dinner
('Conversations', 'dinner', current_date, ARRAY['Beef Stir Fry', 'Tofu Stir Fry (V)', 'Steamed Jasmine Rice', 'Lo Mein Noodles', 'Egg Drop Soup', 'Spring Rolls', 'Fortune Cookies', 'Green Tea'], '4:30 PM – 8:00 PM'),
('Conversations', 'dinner', current_date + 1, ARRAY['Roasted Salmon', 'BBQ Ribs', 'Roasted Baby Potatoes', 'Grilled Asparagus', 'Dinner Rolls', 'Mixed Green Salad', 'Cheesecake', 'Water'], '4:30 PM – 8:00 PM'),
('Conversations', 'dinner', current_date + 2, ARRAY['ISU Burger Bar', 'Impossible Burger (V)', 'Sweet Potato Fries', 'Onion Rings', 'Coleslaw', 'Pickle Bar', 'Soft Serve Ice Cream', 'Iced Tea'], '4:30 PM – 8:00 PM'),

-- FRILEY WINDOWS -- Breakfast
('Friley Windows', 'breakfast', current_date, ARRAY['Made-to-Order Omelettes', 'Avocado Toast', 'Granola & Berries', 'Protein Smoothies', 'Almond Milk Lattes', 'Croissants', 'Hard Boiled Eggs'], '7:30 AM – 11:00 AM'),
('Friley Windows', 'breakfast', current_date + 1, ARRAY['Pumpkin Pancakes', 'Veggie Breakfast Wrap', 'Fresh Fruit Salad', 'Chia Pudding', 'Cold Brew Coffee', 'Gluten-Free Muffins'], '7:30 AM – 11:00 AM'),
('Friley Windows', 'breakfast', current_date + 2, ARRAY['Eggs Benedict', 'Smoked Salmon Toast', 'Steel Cut Oats', 'Seasonal Fruit', 'Matcha Latte', 'Bagel Station'], '7:30 AM – 11:00 AM'),

-- Friley Windows Lunch
('Friley Windows', 'lunch', current_date, ARRAY['BBQ Pulled Pork Sandwich', 'Grilled Portobello Wrap (V)', 'Sweet Potato Soup', 'Kale Salad', 'Hummus & Pita', 'Lemon Bar Dessert', 'Iced Coffee'], '11:00 AM – 3:00 PM'),
('Friley Windows', 'lunch', current_date + 1, ARRAY['Chicken Tikka Masala', 'Dal Makhani (V)', 'Basmati Rice', 'Garlic Naan', 'Cucumber Raita', 'Mango Lassi', 'Kheer'], '11:00 AM – 3:00 PM'),
('Friley Windows', 'lunch', current_date + 2, ARRAY['Greek Bowl', 'Falafel (V)', 'Couscous', 'Tzatziki', 'Roasted Red Pepper Soup', 'Pita Bread', 'Baklava'], '11:00 AM – 3:00 PM'),

-- Friley Windows Dinner
('Friley Windows', 'dinner', current_date, ARRAY['Chicken Parmesan', 'Eggplant Parmesan (V)', 'Penne Pasta', 'Marinara Sauce', 'Caesar Salad', 'Garlic Knots', 'Cannoli', 'Italian Soda'], '4:00 PM – 8:30 PM'),
('Friley Windows', 'dinner', current_date + 1, ARRAY['Korean BBQ Chicken', 'Bibimbap Bowl (V)', 'Kimchi Fried Rice', 'Miso Soup', 'Edamame', 'Mochi Ice Cream', 'Green Tea'], '4:00 PM – 8:30 PM'),
('Friley Windows', 'dinner', current_date + 2, ARRAY['Chipotle Bowl Bar', 'Cilantro Rice', 'Black Beans', 'Fajita Vegetables (V)', 'Grilled Steak', 'Grilled Chicken', 'Pico de Gallo', 'Sour Cream', 'Horchata'], '4:00 PM – 8:30 PM'),

-- UDCC (Union Drive Community Center) -- Breakfast
('UDCC', 'breakfast', current_date, ARRAY['All-You-Can-Eat Pancakes', 'Bacon & Sausage Bar', 'Egg Station', 'Toast Station', 'Cereal Bar', 'Milk & Juice'], '7:00 AM – 10:00 AM'),
('UDCC', 'breakfast', current_date + 1, ARRAY['Breakfast Sandwiches', 'Home Fries', 'Yogurt & Granola', 'Fresh Melon', 'Donuts', 'Coffee & Hot Chocolate'], '7:00 AM – 10:00 AM'),
('UDCC', 'breakfast', current_date + 2, ARRAY['Biscuits & Gravy', 'Scrambled Eggs', 'Turkey Bacon', 'Grits', 'Fresh Orange Juice', 'Pastry Station'], '7:00 AM – 10:00 AM'),

-- UDCC Lunch
('UDCC', 'lunch', current_date, ARRAY['Soup of the Day: Tomato Bisque', 'Grilled Cheese Sandwich', 'Turkey Club', 'Build-Your-Own Salad', 'Potato Chips', 'Chocolate Brownie', 'Lemonade'], '10:30 AM – 2:00 PM'),
('UDCC', 'lunch', current_date + 1, ARRAY['Fried Chicken Tenders', 'Macaroni & Cheese', 'Steamed Broccoli', 'Dinner Roll', 'Side Salad', 'Soft Serve', 'Sweet Tea'], '10:30 AM – 2:00 PM'),
('UDCC', 'lunch', current_date + 2, ARRAY['Pizza Day — Cheese, Pepperoni, Veggie', 'Breadsticks', 'Garden Salad', 'Ranch & Italian Dressing', 'Fruit Cup', 'Soda Fountain'], '10:30 AM – 2:00 PM'),

-- UDCC Dinner
('UDCC', 'dinner', current_date, ARRAY['Pot Roast', 'Vegetable Wellington (V)', 'Mashed Potatoes', 'Green Beans', 'Dinner Rolls', 'Apple Pie', 'Vanilla Ice Cream', 'Coffee'], '4:30 PM – 7:30 PM'),
('UDCC', 'dinner', current_date + 1, ARRAY['Shrimp Fried Rice', 'Vegetable Fried Rice (V)', 'General Tso''s Chicken', 'Steamed Dumplings', 'Egg Rolls', 'Fortune Cookies', 'Fruit Punch'], '4:30 PM – 7:30 PM'),
('UDCC', 'dinner', current_date + 2, ARRAY['Enchiladas (Chicken & Cheese)', 'Bean & Cheese Enchiladas (V)', 'Spanish Rice', 'Refried Beans', 'Tortilla Chips & Salsa', 'Tres Leches Cake', 'Agua Fresca'], '4:30 PM – 7:30 PM')

on conflict do nothing;
