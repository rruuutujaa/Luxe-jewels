# 💎 Luxe Jewels - E-Commerce Website

A complete full-stack jewellery e-commerce website built with **Vanilla JavaScript** (frontend) and **Spring Boot** (backend).

## 🎯 Project Overview

This is a college/academic project-ready e-commerce website for a luxury jewellery shop. The project demonstrates:

- **Frontend**: Pure HTML, CSS, and JavaScript (No frameworks)
- **Backend**: Spring Boot with MongoDB
- **Authentication**: JWT-based authentication
- **API**: RESTful API architecture
- **Database**: MongoDB for data storage

## 📋 Features

### Frontend Features
- ✅ Responsive luxury-themed UI
- ✅ User Registration & Login
- ✅ Product Browsing & Search
- ✅ Shopping Cart Management
- ✅ Wishlist Functionality
- ✅ Checkout & Order Placement
- ✅ Dynamic content loading via Fetch API

### Backend Features
- ✅ JWT Authentication
- ✅ User Management
- ✅ Product Management
- ✅ Shopping Cart API
- ✅ Wishlist API
- ✅ Order Processing
- ✅ Dummy Payment Integration
- ✅ MongoDB Integration

## 🛠️ Technology Stack

### Frontend
- **HTML5** - Structure
- **CSS3** - Styling (Custom luxury theme)
- **Vanilla JavaScript** - Functionality
- **Fetch API** - Backend communication

### Backend
- **Java 17** - Programming Language
- **Spring Boot 3.1.5** - Framework
- **Spring Security** - Authentication & Authorization
- **Spring Data MongoDB** - Database Operations
- **JWT** - Token-based Authentication
- **Maven** - Dependency Management

### Database
- **MongoDB** - NoSQL Database

## 📁 Project Structure

```
JewelleryShop/
├── index.html              # Homepage
├── login.html              # Login page
├── register.html           # Registration page
├── products.html           # Product listing page
├── cart.html               # Shopping cart page
├── wishlist.html           # Wishlist page
├── checkout.html           # Checkout page
├── css/
│   └── style.css          # Main stylesheet
├── js/
│   ├── api.js             # API communication
│   └── main.js            # Common functions
├── backend/
│   ├── pom.xml            # Maven configuration
│   └── src/
│       └── main/
│           ├── java/com/luxejewels/
│           │   ├── model/          # Data models
│           │   ├── repository/     # Data access layer
│           │   ├── service/        # Business logic
│           │   ├── controller/     # REST controllers
│           │   ├── security/       # JWT & Security
│           │   └── config/         # Configuration
│           └── resources/
│               └── application.properties
└── README.md
```

## 🚀 Getting Started

### Prerequisites

1. **Java 17 or higher**
   - Download from: https://www.oracle.com/java/technologies/downloads/

2. **Maven**
   - Download from: https://maven.apache.org/download.cgi
   - Or use Maven wrapper included with Spring Boot

3. **MongoDB**
   - Download from: https://www.mongodb.com/try/download/community
   - Install and start MongoDB service

4. **Web Server** (for frontend)
   - Use VS Code Live Server extension
   - Or any static file server
   - Or simply open HTML files directly in browser (for testing)

### Installation & Setup

#### Step 1: Clone/Download the Project
```bash
cd JewelleryShop
```

#### Step 2: Start MongoDB
Make sure MongoDB is running on your system:
```bash
# Windows (if installed as service, it should start automatically)
# Or run:
mongod

# Mac/Linux
sudo systemctl start mongod
# or
mongod
```

#### Step 3: Configure Backend

1. Navigate to backend directory:
```bash
cd backend
```

2. MongoDB connection is configured in `src/main/resources/application.properties`:
```properties
spring.data.mongodb.uri=mongodb://localhost:27017/jewellery_shop
```

3. If your MongoDB is on a different host/port, update the URI accordingly.

#### Step 4: Build and Run Backend

**Option A: Using Maven (if installed)**
```bash
mvn clean install
mvn spring-boot:run
```

**Option B: Using Maven Wrapper (Windows)**
```bash
mvnw.cmd clean install
mvnw.cmd spring-boot:run
```

**Option C: Using Maven Wrapper (Mac/Linux)**
```bash
./mvnw clean install
./mvnw spring-boot:run
```

**Option D: Using IDE (Recommended)**
- Open the `backend` folder in IntelliJ IDEA or Eclipse
- Wait for Maven to download dependencies
- Run `JewelleryShopApplication.java` as Java Application

The backend server will start on **http://localhost:8080**

#### Step 5: Run Frontend

**Option A: Using VS Code Live Server**
1. Open the project root folder in VS Code
2. Install "Live Server" extension if not already installed
3. Right-click on `index.html` → "Open with Live Server"
4. Frontend will open at `http://127.0.0.1:5500` or similar

**Option B: Using Python HTTP Server**
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```
Then open `http://localhost:8000` in browser

**Option C: Direct File Access**
- Simply double-click `index.html` to open in browser
- Note: Some browsers may block Fetch API requests to localhost, so use a server for best results

#### Step 6: Access the Application

- **Frontend**: http://localhost:8000 (or the port your server uses)
- **Backend API**: http://localhost:8080/api

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user (returns JWT token)

### Products
- `GET /api/products` - Get all products (public)
- `GET /api/products/{id}` - Get product by ID
- `POST /api/products` - Create product (admin, requires auth)

### Cart
- `GET /api/cart` - Get user's cart items (requires auth)
- `POST /api/cart/add` - Add item to cart (requires auth)
- `PUT /api/cart/update/{cartItemId}` - Update cart item quantity (requires auth)
- `DELETE /api/cart/remove/{cartItemId}` - Remove item from cart (requires auth)

### Wishlist
- `GET /api/wishlist` - Get user's wishlist (requires auth)
- `POST /api/wishlist/add` - Add item to wishlist (requires auth)
- `DELETE /api/wishlist/remove/{wishlistItemId}` - Remove from wishlist (requires auth)

### Orders
- `POST /api/orders/create` - Create order from cart (requires auth)
- `POST /api/orders/payment` - Process payment (dummy payment, requires auth)

## 🔐 Authentication

The application uses JWT (JSON Web Token) for authentication:

1. User registers or logs in via `/api/auth/register` or `/api/auth/login`
2. Backend returns a JWT token
3. Frontend stores token in `localStorage`
4. All protected API calls include token in `Authorization` header:
   ```
   Authorization: Bearer <token>
   ```

## 🗄️ Database Collections

MongoDB Collections:
- **users** - User accounts
- **products** - Product catalog
- **cart** - Shopping cart items
- **wishlist** - Wishlist items
- **orders** - Customer orders

## 📝 Sample Data

On first run, the application automatically creates 10 sample products:
- Rings
- Necklaces
- Earrings
- Bracelets
- Watches

You can register a new user and start shopping!

## 🎨 Design Features

- Luxury jewellery theme with gold, black, and beige colors
- Responsive design (mobile-friendly)
- Clean and professional UI
- Smooth animations and transitions
- Intuitive navigation

## 🔧 Configuration

### Backend Configuration (`application.properties`)
```properties
server.port=8080
spring.data.mongodb.uri=mongodb://localhost:27017/jewellery_shop
```

### Frontend Configuration (`js/api.js`)
```javascript
const API_BASE_URL = 'http://localhost:8080/api';
```

If your backend runs on a different port, update this constant.

## 🐛 Troubleshooting

### Backend won't start
- Check if MongoDB is running
- Verify Java version (must be 17+)
- Check if port 8080 is available
- Review application logs for errors

### Frontend can't connect to backend
- Ensure backend is running on port 8080
- Check CORS configuration in `SecurityConfig.java`
- Verify API_BASE_URL in `js/api.js`

### MongoDB connection issues
- Verify MongoDB is installed and running
- Check MongoDB connection string in `application.properties`
- Ensure MongoDB is accessible on localhost:27017

## 📖 Code Explanation for Viva

### Frontend Architecture
1. **HTML Files**: Structure and content of each page
2. **CSS (style.css)**: All styling in one file for easy customization
3. **JavaScript (api.js)**: Handles all API calls using Fetch API
4. **JavaScript (main.js)**: Common utility functions used across pages

### Backend Architecture
1. **Models**: Data structures (User, Product, Cart, Wishlist, Order)
2. **Repositories**: Database access layer (MongoDB operations)
3. **Services**: Business logic layer
4. **Controllers**: REST API endpoints
5. **Security**: JWT authentication and authorization
6. **Config**: Application configuration

### Key Features Explained
- **JWT Authentication**: Secure token-based authentication
- **MongoDB**: NoSQL database for flexible data storage
- **REST API**: Standard HTTP methods for API communication
- **CORS**: Cross-Origin Resource Sharing for frontend-backend communication
- **Password Encryption**: BCrypt for secure password storage

## 🎓 For College/Academic Projects

This project is designed to be viva-friendly:
- ✅ Clean, well-commented code
- ✅ Standard architecture patterns
- ✅ Proper error handling
- ✅ RESTful API design
- ✅ Security best practices
- ✅ Complete documentation

### Common Viva Questions Answered

**Q: Why Vanilla JavaScript instead of React?**
A: The project requirement was to use pure JavaScript without frameworks for better understanding of core concepts.

**Q: How does JWT authentication work?**
A: User logs in → Server generates JWT token → Client stores token → Token sent with each request → Server validates token.

**Q: Why MongoDB?**
A: MongoDB is a NoSQL database that provides flexibility for e-commerce data structures and easy integration with Spring Boot.

**Q: How is password security handled?**
A: Passwords are encrypted using BCrypt before storing in database. Never stored in plain text.

## 👨‍💻 Development

### Adding New Products
Products can be added via:
1. Admin panel (can be implemented)
2. Directly through MongoDB
3. API endpoint (requires authentication)

### Extending Functionality
The codebase is structured to easily add:
- Admin dashboard
- Product reviews
- Order tracking
- Email notifications
- Payment gateway integration

## 📄 License

This project is created for educational/academic purposes.

## 👥 Author

Created for college/academic project submission.

## 🙏 Acknowledgments

- Spring Boot Documentation
- MongoDB Documentation
- JWT.io for JWT standards

---

**Note**: This is a demonstration project. For production use, additional security measures, error handling, and testing should be implemented.
