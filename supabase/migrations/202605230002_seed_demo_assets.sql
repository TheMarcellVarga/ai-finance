insert into public.challenges (slug, title, description, reward_type)
values
  ('read-risk-brief', 'Read a risk brief', 'Review an AI risk explanation and save one assumption for later comparison.', 'research_discipline'),
  ('diversification-check', 'Diversification check', 'Compare sector and asset-class concentration before changing a portfolio scenario.', 'diversification_review')
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  reward_type = excluded.reward_type;

insert into public.achievements (slug, title, description)
values
  ('first-cited-brief', 'First cited brief', 'Saved a research brief with source references.'),
  ('assumption-reviewer', 'Assumption reviewer', 'Reviewed portfolio assumptions without direct buy/sell framing.')
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description;
