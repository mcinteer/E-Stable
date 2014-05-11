using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Principal;
using System.Web;
using EStable.Identity;
using EStable.Models;

namespace EStable.Principle
{
    public class UserOfStablePrinciple : IPrincipal
    {
        public UserOfStablePrinciple(UserOfStablePortal userOfStable, Stable stable, StableUser user)
        {
            Identity = new UserOfStableIdentity(userOfStable, stable, user);
        }

        public bool IsInRole(string role)
        {
            throw new NotImplementedException();
        }

        public IIdentity Identity { get;  set; }
    }
}