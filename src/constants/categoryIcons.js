import {
  Tag, Shirt, Footprints, ShoppingBag, Gem, Sparkles, Home, Gift, Activity, Smile,
  Coffee, Pizza, Utensils, Cake, Apple, ChefHat, Wine, Beer,
  Laptop, Smartphone, Headphones, Tv, Gamepad2, Camera, Speaker, Cpu,
  Bed, Lamp, Sofa, Bath,
  Baby, PartyPopper, Dumbbell, Heart, Bike,
  Wrench, Hammer, Car, Scissors, Book, Flower, Dog, Crown, Compass, Glasses, Watch
} from 'lucide-react'

export const CATEGORY_ICONS = [
  // Moda y Accesorios
  { name: 'Shirt', icon: Shirt, label: 'Moda y Ropa', tags: ['ropa', 'camisa', 'moda', 'vestir', 'pantalon', 'abrigo', 'camiseta', 'vestido', 'jeans', 'boutique', 'prenda'] },
  { name: 'Footprints', icon: Footprints, label: 'Calzado', tags: ['zapatos', 'tenis', 'botas', 'huellas', 'calzado', 'zapateria', 'tacones', 'chanclas'] },
  { name: 'Gem', icon: Gem, label: 'Joyas y Accesorios', tags: ['joyas', 'accesorios', 'oro', 'plata', 'gema', 'anillo', 'collar', 'aretes', 'lujo', 'joyeria'] },
  { name: 'Glasses', icon: Glasses, label: 'Gafas y Lentes', tags: ['gafas', 'lentes', 'sol', 'accesorios', 'anteojos', 'optica'] },
  { name: 'Watch', icon: Watch, label: 'Relojes', tags: ['reloj', 'hora', 'accesorios', 'tiempo', 'cronometro'] },
  { name: 'Sparkles', icon: Sparkles, label: 'Belleza y Cosmética', tags: ['belleza', 'cosmeticos', 'maquillaje', 'brillo', 'skincare', 'spa', 'estetica', 'perfume'] },
  
  // Alimentos y Bebidas
  { name: 'Coffee', icon: Coffee, label: 'Cafetería', tags: ['cafe', 'cafeteria', 'bebida', 'desayuno', 'taza', 'te', 'panaderia'] },
  { name: 'Pizza', icon: Pizza, label: 'Comida Rápida', tags: ['pizza', 'comida', 'rapida', 'restaurante', 'cena', 'queso'] },
  { name: 'Utensils', icon: Utensils, label: 'Restaurante y Cocina', tags: ['restaurante', 'comida', 'cubiertos', 'almuerzo', 'cena', 'plato', 'tenedor', 'cuchillo'] },
  { name: 'Cake', icon: Cake, label: 'Repostería y Pasteles', tags: ['pastel', 'postre', 'dulce', 'panaderia', 'torta', 'ponque', 'pan', 'reposteria'] },
  { name: 'Apple', icon: Apple, label: 'Frutas y Verduras', tags: ['frutas', 'verduras', 'saludable', 'manzana', 'comida', 'mercado', 'tienda', 'sano'] },
  { name: 'ChefHat', icon: ChefHat, label: 'Gastronomía', tags: ['cocina', 'chef', 'restaurante', 'reposteria', 'sombrero', 'cocinar'] },
  { name: 'Wine', icon: Wine, label: 'Vinos y Licores', tags: ['vino', 'licores', 'bebidas', 'alcohol', 'bar', 'copa', 'botella'] },
  { name: 'Beer', icon: Beer, label: 'Cervecería', tags: ['cerveza', 'licores', 'bebidas', 'bar', 'polas', 'trago', 'fiesta'] },

  // Tecnología y Entretenimiento
  { name: 'Laptop', icon: Laptop, label: 'Computadores', tags: ['computador', 'pc', 'portatil', 'tecnologia', 'oficina', 'ordenador', 'pantalla'] },
  { name: 'Smartphone', icon: Smartphone, label: 'Celulares y Móviles', tags: ['celular', 'telefono', 'movil', 'tecnologia', 'smartphone', 'iphone', 'android'] },
  { name: 'Headphones', icon: Headphones, label: 'Audio y Música', tags: ['audifonos', 'auriculares', 'musica', 'sonido', 'tecnologia', 'parlante', 'diadema'] },
  { name: 'Tv', icon: Tv, label: 'Televisores y Pantallas', tags: ['televisor', 'pantalla', 'tv', 'tecnologia', 'hogar', 'television'] },
  { name: 'Gamepad2', icon: Gamepad2, label: 'Videojuegos y Consolas', tags: ['consola', 'control', 'videojuegos', 'gamer', 'tecnologia', 'juegos', 'play', 'xbox', 'nintendo'] },
  { name: 'Camera', icon: Camera, label: 'Fotografía y Video', tags: ['camara', 'fotos', 'video', 'tecnologia', 'lente', 'cine'] },
  { name: 'Speaker', icon: Speaker, label: 'Sonido y Altavoces', tags: ['parlante', 'altavoz', 'sonido', 'musica', 'tecnologia', 'bafle'] },
  { name: 'Cpu', icon: Cpu, label: 'Componentes de PC', tags: ['procesador', 'chip', 'componentes', 'tecnologia', 'hardware', 'cpu'] },

  // Hogar y Estilo de Vida
  { name: 'Home', icon: Home, label: 'Hogar y Decoración', tags: ['hogar', 'casa', 'decoracion', 'muebles', 'interior', 'jardin'] },
  { name: 'Bed', icon: Bed, label: 'Dormitorio y Cama', tags: ['cama', 'dormitorio', 'muebles', 'descanso', 'hogar', 'sabanas', 'colchon'] },
  { name: 'Lamp', icon: Lamp, label: 'Iluminación y Lámparas', tags: ['lampara', 'iluminacion', 'muebles', 'hogar', 'luz', 'bombillo'] },
  { name: 'Sofa', icon: Sofa, label: 'Muebles y Sala', tags: ['sofa', 'sala', 'muebles', 'hogar', 'silla', 'sillon'] },
  { name: 'Bath', icon: Bath, label: 'Baño', tags: ['baño', 'tina', 'aseo', 'hogar', 'ducha'] },

  // Niños y Regalos
  { name: 'Baby', icon: Baby, label: 'Infantil y Bebés', tags: ['bebes', 'niños', 'pañales', 'infantil', 'ropa bebe', 'tetero'] },
  { name: 'Gift', icon: Gift, label: 'Regalos y Detalles', tags: ['regalo', 'detalle', 'obsequio', 'sorpresa', 'fiesta', 'cumpleaños', 'navidad'] },
  { name: 'PartyPopper', icon: PartyPopper, label: 'Fiesta y Eventos', tags: ['fiesta', 'celebracion', 'globos', 'decoracion', 'evento', 'sorpresa'] },
  { name: 'Smile', icon: Smile, label: 'Juguetería y Niños', tags: ['niños', 'otros', 'juguetes', 'cara', 'feliz', 'diversion', 'juegos'] },

  // Salud, Deporte y Fitness
  { name: 'Activity', icon: Activity, label: 'Deporte y Salud', tags: ['deporte', 'fitness', 'salud', 'ejercicio', 'gimnasio', 'entrenar', 'bienestar'] },
  { name: 'Dumbbell', icon: Dumbbell, label: 'Pesas y Fitness', tags: ['pesas', 'gimnasio', 'fitness', 'deporte', 'ejercicio', 'entrenamiento', 'músculo'] },
  { name: 'Heart', icon: Heart, label: 'Salud y Cuidado', tags: ['salud', 'bienestar', 'amor', 'medicina', 'doctor', 'clinica', 'corazon'] },
  { name: 'Bike', icon: Bike, label: 'Ciclismo y Exterior', tags: ['bicicleta', 'ciclismo', 'deporte', 'exterior', 'cicla', 'ruta'] },

  // Ferretería, Auto y Herramientas
  { name: 'Wrench', icon: Wrench, label: 'Herramientas', tags: ['herramientas', 'ferreteria', 'construccion', 'taller', 'llave', 'reparacion'] },
  { name: 'Hammer', icon: Hammer, label: 'Ferretería', tags: ['martillo', 'ferreteria', 'construccion', 'herramientas'] },
  { name: 'Car', icon: Car, label: 'Vehículos y Autos', tags: ['vehiculos', 'carro', 'auto', 'repuestos', 'taller', 'mecanico'] },
  { name: 'Scissors', icon: Scissors, label: 'Papelería y Corte', tags: ['tijeras', 'papeleria', 'peluqueria', 'corte', 'utiles'] },

  // Misceláneos y Generales
  { name: 'Tag', icon: Tag, label: 'General / Oferta', tags: ['etiqueta', 'descuento', 'general', 'oferta', 'promocion', 'precio'] },
  { name: 'ShoppingBag', icon: ShoppingBag, label: 'Bolsos y Carteras', tags: ['bolsos', 'compras', 'cartera', 'general', 'bolsa'] },
  { name: 'Book', icon: Book, label: 'Libros y Papelería', tags: ['libros', 'lectura', 'papeleria', 'escuela', 'educacion', 'cuaderno'] },
  { name: 'Flower', icon: Flower, label: 'Flores y Jardinería', tags: ['flores', 'jardin', 'plantas', 'decoracion', 'regalo', 'floristeria'] },
  { name: 'Dog', icon: Dog, label: 'Mascotas', tags: ['mascotas', 'perros', 'gatos', 'animales', 'veterinaria', 'alimento'] },
  { name: 'Crown', icon: Crown, label: 'Exclusivo y Premium', tags: ['premium', 'exclusivo', 'rey', 'reina', 'lujo', 'corona', 'vip'] },
  { name: 'Compass', icon: Compass, label: 'Viajes y Aventura', tags: ['viajes', 'aventura', 'turismo', 'exterior', 'brujula'] },
]

export function getCategoryIconComponent(name) {
  const match = CATEGORY_ICONS.find(i => i.name === name)
  return match ? match.icon : Tag
}
