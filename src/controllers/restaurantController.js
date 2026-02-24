import { restaurants } from "../data/restaurants.js";

export const createRestaurant = (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Nombre requerido" });
  }

  const newRestaurant = {
    id: crypto.randomUUID(),
    name,
    createdAt: new Date()
  };

  restaurants.push(newRestaurant);

  res.json(newRestaurant);
};

export const getRestaurants = (req, res) => {
  res.json(restaurants);
};