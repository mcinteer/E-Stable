using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using EStable.Constants;
using EStable.Models;
using EStable.Repositories;

namespace EStable.Services
{
    public class UserOfStableService
    {
        private readonly StableUserRepository _stableUserRepository;
        private readonly UserOfStableRepository _userOfStableRepository;

        public UserOfStableService()
        {
            _userOfStableRepository = new UserOfStableRepository();
            _stableUserRepository = new StableUserRepository();
        }

        public UserOfStablePortal CreateUserOfStable(AccountModel model)
        {
            var userOfStable = CreateUserOfStable(model.Email, model.Password, model.FirstName, model.LastName);
            _userOfStableRepository.Save(userOfStable);

            userOfStable = _userOfStableRepository.GetByStableTypeAndEmail(Codes.UserTypeCode.Stable, model.Email);
            return userOfStable;
        }

        public UserOfStablePortal GetUserOfStable(string email)
        {
            return _userOfStableRepository.GetByStableTypeAndEmail(Codes.UserTypeCode.Stable, email);
        }

        private UserOfStablePortal CreateUserOfStable(string email, string password, string firstName, string lastName)
        {
            return new UserOfStablePortal()
                {
                    Email = email,
                    FirstName = firstName,
                    LastName = lastName,
                    Password = password,
                    ForcePWChange = "0",
                    Active = "1"
                };
        }
    }
}