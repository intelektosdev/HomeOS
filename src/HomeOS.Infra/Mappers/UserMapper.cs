using HomeOS.Domain.UserTypes;
using HomeOS.Infra.DataModels;

namespace HomeOS.Infra.Mappers;

public static class UserMapper
{
    public static UserDbModel ToDb(User user)
    {
        return new UserDbModel
        {
            Id = user.Id,
            Email = user.Email,
            PasswordHash = user.PasswordHash,
            Name = user.Name,
            CreatedAt = user.CreatedAt
        };
    }

    public static User ToDomain(UserDbModel dbModel)
    {
        return new User(
            dbModel.Id,
            dbModel.Email,
            dbModel.PasswordHash,
            dbModel.Name,
            dbModel.CreatedAt
        );
    }
}
