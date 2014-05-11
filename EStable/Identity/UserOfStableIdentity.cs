using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Principal;
using System.Web;
using EStable.Models;

namespace EStable.Identity
{
    public class UserOfStableIdentity : IIdentity
    {
        public string Name { get;  set; }
        public string AuthenticationType { get;  set; }
        public bool IsAuthenticated { get;  set; }
        
        public UserOfStablePortal CurrentPortal { get; set; }
        
        public Stable CurrentStable { get; set; }
        
        public StableUser CurrentStableUser { get; set; }

        public UserOfStableIdentity(UserOfStablePortal userOfStable, Stable stable, StableUser user)
        {
            Name = userOfStable.FirstName;
            CurrentPortal = userOfStable;
            CurrentStableUser = user;
        }

    }
}