// src/models/User.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  fullName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Full name is required' }
    }
  },
  phone: {
    type: DataTypes.STRING(15),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Phone number is required' },
      is: { args: /^\+94[0-9]{9}$/, msg: 'Phone must start with +94 followed by 9 digits' }
    }
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: { msg: 'Invalid email format' },
      notEmpty: { msg: 'Email is required' }
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: { args: [8, 100], msg: 'Password must be at least 8 characters' }
    }
  },
  role: {
    type: DataTypes.ENUM('farmer', 'buyer'),
    allowNull: false,
    defaultValue: 'farmer'  // frontend will send it
  },
  district: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      isIn: {
        args: [['Ampara','Anuradhapura','Badulla','Batticaloa','Colombo','Galle','Gampaha',
                'Hambantota','Jaffna','Kalutara','Kandy','Kegalle','Kilinochchi','Kurunegala',
                'Mannar','Matale','Matara','Monaragala','Mullaitivu','Nuwara Eliya','Polonnaruwa',
                'Puttalam','Ratnapura','Trincomalee','Vavuniya']],
        msg: 'Invalid district selected'
      }
    }
  },
  bio: {
  type: DataTypes.TEXT,
  allowNull: true,
  defaultValue: null,
},
avatar: {
  type: DataTypes.TEXT,
  allowNull: true,
  defaultValue: null,
},
}, {
  tableName: 'users',
  timestamps: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    }
  }
});

// Method to check password
User.prototype.validPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = User;