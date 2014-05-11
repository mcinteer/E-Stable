using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace EStable.Domain
{
    public class GetStableRegFileInfoResponse
    {
        public string EmailAddress { get; set; }
        public string SystemFileName { get; set; }
        public string UserFileName { get; set; }
    }
}