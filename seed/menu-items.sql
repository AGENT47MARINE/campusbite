-- Safely populate missing menu entries without deleting or changing existing data.
-- Safe to run again; existing menu names are left untouched.
insert into public.menu_items (name, category, price, is_veg, stock, prep_minutes, description)
select seed.name, seed.category, seed.price, seed.is_veg, seed.stock, seed.prep_minutes, seed.description
from (
  values
    ('Veg Meals', 'meal', 70, true, 40, 5, 'Rice, sambar, rasam, poriyal, curd and papad'),
    ('Masala Dosa', 'meal', 50, true, 25, 8, 'Crispy dosa with potato masala, chutney and sambar'),
    ('Idli Vada Combo', 'meal', 40, true, 30, 5, '2 idlis and 1 medu vada with chutney and sambar'),
    ('Curd Rice', 'meal', 45, true, 20, 3, 'Curd rice with pickle'),
    ('Lemon Rice', 'meal', 45, true, 18, 3, 'Tangy lemon rice with peanuts'),
    ('Paneer Butter Masala with 2 Chapati', 'meal', 90, true, 0, 10, 'Paneer in rich tomato gravy with 2 chapatis'),
    ('Chicken Biryani', 'meal', 120, false, 2, 5, 'Chennai-style chicken biryani with raita'),
    ('Egg Fried Rice', 'meal', 80, false, 15, 10, 'Fried rice with scrambled egg and vegetables'),
    ('Parotta with Salna', 'meal', 60, false, 12, 8, '2 parottas with chicken salna'),
    ('Samosa', 'snack', 15, true, 50, 2, 'Crispy potato samosa'),
    ('Veg Puff', 'snack', 20, true, 35, 2, 'Baked puff with spiced vegetables'),
    ('Bajji Plate', 'snack', 30, true, 20, 6, 'Raw banana and chilli bajji, 4 pieces'),
    ('Egg Puff', 'snack', 25, false, 15, 2, 'Baked puff with spiced egg'),
    ('Filter Coffee', 'drink', 20, true, 80, 2, 'South Indian filter coffee'),
    ('Masala Tea', 'drink', 15, true, 80, 2, 'Ginger and cardamom tea'),
    ('Fresh Lime Soda', 'drink', 30, true, 30, 3, 'Sweet or salt'),
    ('Buttermilk', 'drink', 15, true, 40, 1, 'Spiced chilled buttermilk'),
    ('Gulab Jamun (2 pcs)', 'sweet', 30, true, 25, 1, 'Soft gulab jamun in sugar syrup'),
    ('Payasam', 'sweet', 35, true, 15, 1, 'Vermicelli payasam'),
    ('Kesari', 'sweet', 25, true, 20, 1, 'Rava kesari with ghee and cashew')
) as seed(name, category, price, is_veg, stock, prep_minutes, description)
where not exists (
  select 1
  from public.menu_items existing
  where lower(existing.name) = lower(seed.name)
);
