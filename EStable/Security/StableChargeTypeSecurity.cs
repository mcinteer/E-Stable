using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using EStable.Exceptions;
using EStable.Models;

namespace EStable.Security
{
    public interface IStableChargeTypeSecurity
    {
        void VerifyUserCanAddStableCharge(UserOfStablePortal user);
    }

    public class StableChargeTypeSecurity : IStableChargeTypeSecurity
    {
        public void VerifyUserCanAddStableCharge(UserOfStablePortal user)
        {
            if (user == null)
            {
                throw new NotAuthorizedToAddChargeTypeException();
            }
        }
    }
}