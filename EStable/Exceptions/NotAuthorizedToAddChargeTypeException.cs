using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using EStable.Models;

namespace EStable.Exceptions
{
    public class NotAuthorizedToAddChargeTypeException : Exception
    {
        public NotAuthorizedToAddChargeTypeException()
        {
            
        }
    }
}