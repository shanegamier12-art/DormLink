-- ===================================================
-- DormLink — database.sql
-- Database schema for MS SQL Server
-- ===================================================

-- 1. Create Database
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'dormlink_shenangel')
BEGIN
    CREATE DATABASE dormlink_shenangel;
END
GO

USE dormlink_shenangel;
GO

-- 2. Create Landlord Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'landlord')
BEGIN
    CREATE TABLE landlord (
        id            INT           PRIMARY KEY,
        username      NVARCHAR(100) NOT NULL,
        password_hash NVARCHAR(255) NOT NULL
    );
END
GO

-- 3. Create Listings Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'listings')
BEGIN
    CREATE TABLE listings (
        id                            INT           PRIMARY KEY IDENTITY(1,1),

        -- Property Details
        name                          NVARCHAR(200) NOT NULL,
        description                   NVARCHAR(MAX),
        address                       NVARCHAR(500) NOT NULL,

        -- Pricing
        monthly_rent                  DECIMAL(10,2) NOT NULL,
        security_deposit              DECIMAL(10,2),
        advance_payment               DECIMAL(10,2),

        -- Utilities
        water_included                BIT           DEFAULT 0,
        electricity_included          BIT           DEFAULT 0,
        wifi_included                 BIT           DEFAULT 0,

        -- Additional Fees
        additional_fees               NVARCHAR(MAX),

        -- Room Information
        room_type                     NVARCHAR(50)  NOT NULL DEFAULT 'Solo Room',
        occupants_allowed             INT,
        room_size                     NVARCHAR(100),
        available_rooms               INT,
        available_beds                INT,

        -- Amenities
        amenity_wifi                  BIT           DEFAULT 0,
        amenity_aircon                BIT           DEFAULT 0,
        amenity_electric_fan          BIT           DEFAULT 0,
        amenity_private_cr            BIT           DEFAULT 0,
        amenity_shared_cr             BIT           DEFAULT 0,
        amenity_kitchen               BIT           DEFAULT 0,
        amenity_laundry               BIT           DEFAULT 0,
        amenity_parking               BIT           DEFAULT 0,
        amenity_study_area            BIT           DEFAULT 0,
        amenity_cctv                  BIT           DEFAULT 0,
        amenity_security_guard        BIT           DEFAULT 0,
        amenity_water_supply          BIT           DEFAULT 0,

        -- House Rules
        rule_curfew                   BIT           DEFAULT 0,
        rule_visitors_allowed         BIT           DEFAULT 0,
        rule_cooking_allowed          BIT           DEFAULT 0,
        rule_drinking_allowed         BIT           DEFAULT 0,
        rule_smoking_allowed          BIT           DEFAULT 0,
        rule_pets_allowed             BIT           DEFAULT 0,
        rule_male_only                BIT           DEFAULT 0,
        rule_female_only              BIT           DEFAULT 0,
        rule_students_only            BIT           DEFAULT 0,
        rule_working_professionals_only BIT         DEFAULT 0,

        -- Availability
        availability_status           NVARCHAR(20)  NOT NULL DEFAULT 'Available',
        date_available                DATE,
        last_updated                  DATETIME      NOT NULL DEFAULT GETDATE(),

        -- Owner Contact
        owner_name                    NVARCHAR(200),
        contact_number                NVARCHAR(50),

        -- Image
        image_filename                NVARCHAR(255)
    );
END
GO
