namespace HomeOS.Domain.UserTypes

open System
open System.Text.RegularExpressions

// --- TYPES ---

type User =
    { Id: Guid
      Email: string
      PasswordHash: string
      Name: string
      CreatedAt: DateTime }

// --- VALIDATION ERRORS ---

module UserModule =

    type UserError =
        | InvalidEmail
        | PasswordTooShort
        | NameRequired
        | EmailAlreadyExists
        | InvalidCredentials

    // Email validation using regex
    let private isValidEmail (email: string) =
        let pattern = @"^[^@\s]+@[^@\s]+\.[^@\s]+$"
        Regex.IsMatch(email, pattern)

    // Create new user (for registration)
    let create (email: string) (passwordHash: string) (name: string) : Result<User, UserError> =
        if String.IsNullOrWhiteSpace(name) then
            Error NameRequired
        elif not (isValidEmail email) then
            Error InvalidEmail
        elif String.IsNullOrWhiteSpace(passwordHash) then
            Error PasswordTooShort
        else
            Ok
                { Id = Guid.NewGuid()
                  Email = email.ToLowerInvariant()
                  PasswordHash = passwordHash
                  Name = name.Trim()
                  CreatedAt = DateTime.Now }

    // Validate password length (to be called before hashing)
    let validatePassword (password: string) : Result<string, UserError> =
        if String.IsNullOrWhiteSpace(password) || password.Length < 6 then
            Error PasswordTooShort
        else
            Ok password
